import { describe, expect, it } from "vitest";

import { buildDocument, buildSampleLikeDocument } from "./test-support/fixtures";
import { runAudit } from "./run-audit";

import {
  ARCHITECTURE_SCHEMA_VERSION,
  parseArchitectureDocument,
  type ArchitectureDocument,
} from "@axon/diagram-schema";

/** Same content as the sample fixture with nodes and edges in reverse order. */
function buildReorderedSampleDocument(): ArchitectureDocument {
  const document = buildSampleLikeDocument();
  return parseArchitectureDocument({
    ...document,
    schemaVersion: ARCHITECTURE_SCHEMA_VERSION,
    nodes: [...document.nodes].reverse(),
    edges: [...document.edges].reverse(),
  });
}

describe("runAudit", () => {
  it("produces the expected findings for the sample topology", () => {
    const candidates = runAudit(buildSampleLikeDocument());
    expect(candidates.map((candidate) => candidate.ruleId)).toEqual([
      "single-point-of-failure",
      "single-point-of-failure",
      "single-point-of-failure",
      "missing-dead-letter-path",
      "telemetry-coverage",
    ]);
  });

  it("orders by severity, then rule id, then fingerprint", () => {
    const candidates = runAudit(buildSampleLikeDocument());
    const severities = candidates.map((candidate) => candidate.severity);
    expect(severities).toEqual(["high", "high", "high", "medium", "low"]);
    const highFingerprints = candidates
      .filter((candidate) => candidate.severity === "high")
      .map((candidate) => candidate.fingerprint);
    expect(highFingerprints).toEqual([...highFingerprints].sort());
  });

  it("is deterministic: two runs on the same document are deeply equal", () => {
    const document = buildSampleLikeDocument();
    expect(runAudit(document)).toEqual(runAudit(document));
  });

  it("keeps fingerprints and ordering stable when document elements are reordered", () => {
    const original = runAudit(buildSampleLikeDocument());
    const reordered = runAudit(buildReorderedSampleDocument());
    expect(reordered.map((candidate) => candidate.fingerprint)).toEqual(
      original.map((candidate) => candidate.fingerprint),
    );
  });

  it("returns nothing for an empty document", () => {
    expect(runAudit(buildDocument([]))).toEqual([]);
  });
});

describe("finding language honesty guard", () => {
  const FORBIDDEN_PATTERNS = [
    /will fail/i,
    /guarantee/i,
    /verif/i,
    /insecure/i,
    /downtime/i,
    /your production system/i,
    /permanently/i,
  ];

  const documents = [
    buildSampleLikeDocument(),
    buildDocument(
      [{ id: "app" }, { id: "search", planned: true }, { id: "orphan" }],
      [["app", "search", "sync"]],
    ),
  ];

  it("never claims a structural finding proves a production failure", () => {
    for (const document of documents) {
      for (const candidate of runAudit(document)) {
        const texts = [
          candidate.title,
          candidate.detected,
          candidate.inference,
          candidate.limitation,
          candidate.recommendation,
          ...candidate.evidence.map((item) => item.text),
        ];
        for (const text of texts) {
          for (const pattern of FORBIDDEN_PATTERNS) {
            expect(text).not.toMatch(pattern);
          }
        }
      }
    }
  });

  it("anchors every inference to the architecture document and states a limitation", () => {
    for (const document of documents) {
      for (const candidate of runAudit(document)) {
        expect(candidate.inference).toContain("Based on the current architecture document");
        expect(candidate.limitation.length).toBeGreaterThan(0);
        expect(candidate.recommendation).toMatch(/review|consider/i);
        expect(candidate.evidence.length).toBeGreaterThan(0);
      }
    }
  });
});
