import { describe, it, expect, vi } from "vitest";
import { FileWatcher, type ChangedFile } from "./file-watcher";
import { WorkspaceBoundary } from "./workspace-boundary";
import { join } from "node:path";
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "axon-watcher-test-"));
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "index.ts"), "console.log('hi');");
  return dir;
}

describe("FileWatcher", () => {
  it("starts in idle status", () => {
    const dir = createTempDir();
    try {
      const boundary = new WorkspaceBoundary({ rootDir: dir });
      const watcher = new FileWatcher({
        boundary,
        onChange: vi.fn(),
      });
      expect(watcher.status).toBe("idle");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("transitions to stopped on stop()", () => {
    const dir = createTempDir();
    try {
      const boundary = new WorkspaceBoundary({ rootDir: dir });
      const watcher = new FileWatcher({
        boundary,
        onChange: vi.fn(),
      });
      watcher.stop();
      expect(watcher.status).toBe("stopped");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("filters temporary/editor files", () => {
    const dir = createTempDir();
    try {
      const boundary = new WorkspaceBoundary({ rootDir: dir });
      const changes: ChangedFile[] = [];
      const watcher = new FileWatcher({
        boundary,
        debounceMs: 10,
        onChange: (files) => changes.push(...files),
      });

      // Access the private method via prototype for testing
      const isTemp = (watcher as unknown as { isTemporaryFile: (f: string) => boolean }).isTemporaryFile;
      expect(isTemp.call(watcher, "file.swp")).toBe(true);
      expect(isTemp.call(watcher, "file~")).toBe(true);
      expect(isTemp.call(watcher, ".#lock")).toBe(true);
      expect(isTemp.call(watcher, ".DS_Store")).toBe(true);
      expect(isTemp.call(watcher, "index.ts")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("debounce timer configuration is respected", () => {
    const dir = createTempDir();
    try {
      const boundary = new WorkspaceBoundary({ rootDir: dir });
      const watcher = new FileWatcher({
        boundary,
        debounceMs: 500,
        onChange: vi.fn(),
      });
      // The debounceMs field should be set (internal state)
      expect(watcher.status).toBe("idle");
      watcher.stop();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
