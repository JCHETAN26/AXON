import { describe, expect, it, vi } from "vitest";

import { buildArchitectureDocument } from "./draft-to-document";
import { GeneratedArchitectureDraftSchema, type GeneratedArchitectureDraft } from "./draft-schema";
import { DraftValidationError } from "./errors";
import { generateArchitectureDraft } from "./generate-architecture";
import { assignPositions } from "./layout";
import { normalizeDraft } from "./normalize-draft";
import { OfflineTemplateProvider, buildTemplateDraft } from "./offline-template-provider";
import { parseDraft } from "./parse-draft";
import { type ArchitectureProvider } from "./provider";

const NOW = "2026-07-19T12:00:00.000Z";

function validDraft(): GeneratedArchitectureDraft {
  return {
    name: "Test system",
    assumptions: [{ label: "MAU", value: "10,000" }],
    groups: [{ key: "app", label: "Application" }],
    nodes: [
      { key: "gateway", name: "gateway", category: "Gateway", groupKey: "app" },
      { key: "service", name: "service", category: "Compute", groupKey: "app" },
      { key: "db", name: "db", category: "Database" },
    ],
    edges: [
      { sourceKey: "gateway", targetKey: "service", kind: "sync" },
      { sourceKey: "service", targetKey: "db", kind: "data" },
    ],
  };
}

describe("draft schema", () => {
  it("rejects drafts with dangling edge references", () => {
    const draft = validDraft();
    draft.edges.push({ sourceKey: "service", targetKey: "ghost", kind: "sync" });
    expect(GeneratedArchitectureDraftSchema.safeParse(draft).success).toBe(false);
  });

  it("strips model-invented fields like ids and timestamps", () => {
    const polluted = {
      ...validDraft(),
      id: "model-made-this-up",
      createdAt: "2020-01-01",
      nodes: validDraft().nodes.map((node) => ({ ...node, id: "nope", x: 12, y: 30 })),
    };
    const result = GeneratedArchitectureDraftSchema.safeParse(polluted);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
      expect(result.data.nodes[0]).not.toHaveProperty("x");
    }
  });
});

describe("parseDraft", () => {
  it("parses JSON wrapped in fences and prose", () => {
    const text = `Here is your architecture:\n\n\`\`\`json\n${JSON.stringify(validDraft())}\n\`\`\`\nHope that helps!`;
    expect(parseDraft(text).ok).toBe(true);
  });

  it("reports issues for garbage and for schema violations", () => {
    expect(parseDraft("no json here").ok).toBe(false);
    const bad = parseDraft(JSON.stringify({ name: "x" }));
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.issues.length).toBeGreaterThan(0);
    }
  });
});

describe("normalizeDraft", () => {
  it("slugifies keys, remaps references and dedupes edges", () => {
    const draft = validDraft();
    const firstNode = draft.nodes[0];
    if (firstNode === undefined) {
      throw new Error("fixture has no nodes");
    }
    draft.nodes[0] = { ...firstNode, key: "API Gateway!" };
    draft.edges[0] = { sourceKey: "API Gateway!", targetKey: "service", kind: "sync" };
    draft.edges.push({ sourceKey: "API Gateway!", targetKey: "service", kind: "sync" });
    const normalized = normalizeDraft(draft);
    expect(normalized.nodes[0]?.key).toBe("api-gateway");
    expect(normalized.edges.filter((edge) => edge.sourceKey === "api-gateway")).toHaveLength(1);
  });
});

describe("generateArchitectureDraft", () => {
  function providerReturning(...responses: string[]): ArchitectureProvider {
    const complete = vi.fn();
    for (const response of responses) {
      complete.mockResolvedValueOnce(response);
    }
    return { id: "fake", complete };
  }

  it("returns after one attempt for valid output", async () => {
    const provider = providerReturning(JSON.stringify(validDraft()));
    const outcome = await generateArchitectureDraft(provider, "a system");
    expect(outcome.attempts).toBe(1);
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  it("repairs invalid output exactly once", async () => {
    const provider = providerReturning("not json at all", JSON.stringify(validDraft()));
    const outcome = await generateArchitectureDraft(provider, "a system");
    expect(outcome.attempts).toBe(2);
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });

  it("throws after the single repair attempt fails, without a third call", async () => {
    const provider = providerReturning("garbage", "still garbage");
    await expect(generateArchitectureDraft(provider, "a system")).rejects.toBeInstanceOf(
      DraftValidationError,
    );
    expect(provider.complete).toHaveBeenCalledTimes(2);
  });
});

describe("layout and document conversion", () => {
  it("assigns deterministic positions", () => {
    const draft = normalizeDraft(validDraft());
    const first = assignPositions(draft);
    const second = assignPositions(draft);
    expect(first).toEqual(second);
    expect(first.get("gateway")).toEqual({ x: 40, y: 60 });
    // Ungrouped nodes land in a trailing column.
    expect(first.get("db")?.x).toBeGreaterThan(first.get("gateway")?.x ?? 0);
  });

  it("builds a valid document with AXON-owned identity", () => {
    const document = buildArchitectureDocument({
      draft: normalizeDraft(validDraft()),
      documentId: "doc-1",
      projectId: "project-1",
      createdAt: NOW,
      updatedAt: NOW,
      prompt: "a system for testing",
      providerId: "fake",
    });
    expect(document.schemaVersion).toBe("1.0");
    expect(document.id).toBe("doc-1");
    expect(document.projectId).toBe("project-1");
    expect(document.source.kind).toBe("generated");
    expect(document.nodes.every((node) => node.position !== undefined)).toBe(true);
    expect(document.edges[0]?.id).toBe("gateway--service--sync");
  });
});

describe("OfflineTemplateProvider", () => {
  it("produces drafts that survive the full pipeline", async () => {
    const provider = new OfflineTemplateProvider();
    const outcome = await generateArchitectureDraft(
      provider,
      "A SaaS platform with billing, background jobs and file exports",
    );
    expect(outcome.attempts).toBe(1);
    const keys = outcome.draft.nodes.map((node) => node.key);
    expect(keys).toEqual(
      expect.arrayContaining(["payments-service", "queue", "workers", "object-storage"]),
    );
  });

  it("is deterministic for the same prompt", () => {
    const a = buildTemplateDraft("an auth-heavy saas with cache");
    const b = buildTemplateDraft("an auth-heavy saas with cache");
    expect(a).toEqual(b);
  });
});
