import { describe, expect, it } from "vitest";

import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";
import { assembleProjectExport, type ProjectExportInput } from "./build-project-export";

const NOW = new Date("2026-07-21T12:00:00.000Z");

const doc = createSampleArchitectureDocument({
  id: "p1",
  projectId: "p1",
  now: "2026-07-20T00:00:00.000Z",
});

function baseInput(overrides: Partial<ProjectExportInput> = {}): ProjectExportInput {
  return {
    name: "Checkout",
    description: "A project",
    createdAt: new Date("2026-07-20T00:00:00.000Z"),
    updatedAt: new Date("2026-07-20T06:00:00.000Z"),
    document: doc,
    artifacts: {},
    ...overrides,
  };
}

describe("assembleProjectExport", () => {
  it("produces a versioned bundle with the infrastructure disclaimer", () => {
    const bundle = assembleProjectExport(baseInput(), NOW, "beta");
    expect(bundle.exportSchemaVersion).toBe("1.0");
    expect(bundle.kind).toBe("axon-project-export");
    expect(bundle.disclaimer).toMatch(/not an infrastructure backup/);
    expect(bundle.project.name).toBe("Checkout");
    expect(bundle.project.startingPoint).toBe("sample");
    expect(bundle.architectureDocument.id).toBe("p1");
  });

  it("refuses to export an invalid architecture document", () => {
    expect(() => assembleProjectExport(baseInput({ document: { nope: true } }), NOW)).toThrow(
      /failed validation/,
    );
  });

  it("includes valid audit/recommendation/simulation artifacts and omits invalid ones", () => {
    const bundle = assembleProjectExport(
      baseInput({
        artifacts: {
          audit: {
            schemaVersion: "1.0",
            projectId: "p1",
            documentId: "p1",
            rulesetVersion: "1.0.0",
            lastRunAt: "2026-07-20T01:00:00.000Z",
            documentUpdatedAtAtRun: "2026-07-20T00:00:00.000Z",
            findings: [],
          },
          recommendation: { totally: "invalid" },
        },
      }),
      NOW,
    );
    expect(bundle.audit).toBeDefined();
    expect(bundle.recommendations).toBeUndefined();
  });

  it("NEVER exports raw Compose YAML — only a safe import summary", () => {
    const bundle = assembleProjectExport(
      baseInput({
        artifacts: {
          import: {
            schemaVersion: "1.0",
            projectId: "p1",
            composeText:
              "services:\n  db:\n    image: postgres\n    environment:\n      PASSWORD: hunter2",
            categoryOverrides: { db: "Database" },
            updatedAt: "2026-07-20T02:00:00.000Z",
          },
        },
      }),
      NOW,
    );
    // The summary is present, but the raw YAML / secret never appears anywhere.
    expect(bundle.importSummary).toMatchObject({ hasDraft: true, categoryOverrideCount: 1 });
    const serialized = JSON.stringify(bundle);
    expect(serialized).not.toContain("composeText");
    expect(serialized).not.toContain("hunter2");
    expect(serialized).not.toContain("image: postgres");
  });
});
