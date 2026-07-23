import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { WorkspaceBoundary } from "./workspace-boundary";
import { LocalAnalyzer, LocalAnalysisCancelledError } from "./local-analyzer";

function createFixtureWorkspace(): string {
  const dir = mkdtempSync(join(tmpdir(), "axon-analyzer-test-"));
  mkdirSync(join(dir, "src"), { recursive: true });

  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name: "test-app",
      dependencies: { express: "^4.18.0", pg: "^8.11.0", redis: "^4.6.0" },
    })
  );
  writeFileSync(join(dir, "src", "server.ts"), [
    'import express from "express";',
    "const app = express();",
    'app.get("/api/health", (req, res) => res.json({ ok: true }));',
    "app.listen(3000);",
  ].join("\n"));

  writeFileSync(join(dir, ".env"), "DATABASE_URL=postgres://user:pass@localhost/db\nREDIS_URL=redis://localhost");

  return dir;
}

describe("LocalAnalyzer", () => {
  let workspaceDir: string;

  beforeEach(() => {
    workspaceDir = createFixtureWorkspace();
  });

  afterEach(() => {
    rmSync(workspaceDir, { recursive: true, force: true });
  });

  it("analyzes local workspace and produces proposal with evidence", async () => {
    const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
    const analyzer = new LocalAnalyzer({ boundary });
    const result = await analyzer.analyze();

    expect(result.provenance).toBe("locally-observed");
    expect(result.proposal).toBeDefined();
    expect(result.proposal.schemaVersion).toBe("1.0");
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.inventory.fileCount).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("respects evidence count limits", async () => {
    const boundary = new WorkspaceBoundary({
      rootDir: workspaceDir,
      limits: { maxEvidenceCount: 1 },
    });
    const analyzer = new LocalAnalyzer({ boundary });
    const result = await analyzer.analyze();

    expect(result.evidence.length).toBeLessThanOrEqual(1);
  });

  it("supports cancellation via AbortSignal", async () => {
    const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
    const analyzer = new LocalAnalyzer({ boundary });
    const controller = new AbortController();

    // Abort immediately
    controller.abort();

    await expect(analyzer.analyze(controller.signal)).rejects.toThrow(
      LocalAnalysisCancelledError
    );
  });

  it("computes file hashes for caching", async () => {
    const boundary = new WorkspaceBoundary({ rootDir: workspaceDir });
    const analyzer = new LocalAnalyzer({ boundary });
    const result = await analyzer.analyze();

    expect(result.fileHashes.size).toBeGreaterThan(0);
    for (const [, hash] of result.fileHashes) {
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
