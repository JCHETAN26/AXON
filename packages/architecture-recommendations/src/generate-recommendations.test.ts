import { describe, expect, it } from "vitest";

import { generateRecommendations } from "./generate-recommendations";
import { buildDocument, buildFindings, buildSampleLikeDocument } from "./test-support/fixtures";

const DOCUMENT = buildSampleLikeDocument();
const FINDINGS = buildFindings(DOCUMENT);

function generate() {
  return generateRecommendations({ document: DOCUMENT, findings: FINDINGS });
}

describe("generateRecommendations", () => {
  it("produces one recommendation per supported finding", () => {
    const recommendations = generate();
    // 3 SPOF (manual) + 1 dead-letter (automatic) + 1 telemetry (automatic).
    expect(recommendations).toHaveLength(5);
    // Automatic changes first, then by title: "Connect…" before "Represent…".
    expect(recommendations.map((item) => item.builderId)).toEqual([
      "connect-telemetry-coverage",
      "add-dead-letter-path",
      "review-single-point-of-failure",
      "review-single-point-of-failure",
      "review-single-point-of-failure",
    ]);
  });

  it("links every recommendation to the finding that triggered it", () => {
    const findingFingerprints = new Set(FINDINGS.map((finding) => finding.fingerprint));
    for (const recommendation of generate()) {
      expect(findingFingerprints.has(recommendation.findingFingerprint)).toBe(true);
    }
  });

  it("is deterministic across runs", () => {
    expect(generate()).toEqual(generate());
  });

  it("orders automatic changes before manual review", () => {
    const modes = generate().map((item) => item.mode);
    expect(modes.indexOf("manual-review")).toBeGreaterThan(modes.lastIndexOf("automatic"));
  });

  it("keeps fingerprints stable when finding order changes", () => {
    const reversed = generateRecommendations({
      document: DOCUMENT,
      findings: [...FINDINGS].reverse(),
    });
    expect(reversed.map((item) => item.fingerprint)).toEqual(
      generate().map((item) => item.fingerprint),
    );
  });

  it("gives manual-review recommendations no operations", () => {
    for (const recommendation of generate()) {
      if (recommendation.mode === "manual-review") {
        expect(recommendation.operations).toEqual([]);
      } else {
        expect(recommendation.operations.length).toBeGreaterThan(0);
      }
    }
  });

  it("ignores resolved findings", () => {
    const resolved = FINDINGS.map((finding) => ({ ...finding, state: "resolved" as const }));
    expect(generateRecommendations({ document: DOCUMENT, findings: resolved })).toEqual([]);
  });

  it("still recommends for acknowledged findings", () => {
    const acknowledged = FINDINGS.map((finding) => ({
      ...finding,
      state: "acknowledged" as const,
    }));
    expect(
      generateRecommendations({ document: DOCUMENT, findings: acknowledged }).length,
    ).toBeGreaterThan(0);
  });

  it("produces nothing without findings — a recommendation needs a source", () => {
    expect(generateRecommendations({ document: DOCUMENT, findings: [] })).toEqual([]);
  });

  it("skips findings from rules that have no builder", () => {
    const unsupported = FINDINGS.map((finding) => ({ ...finding, ruleId: "some-future-rule" }));
    expect(generateRecommendations({ document: DOCUMENT, findings: unsupported })).toEqual([]);
  });

  it("marks a running component planned when it depends on a planned one", () => {
    const document = buildDocument(
      [{ id: "app" }, { id: "search", planned: true }],
      [["app", "search", "sync"]],
    );
    const recommendation = generateRecommendations({
      document,
      findings: buildFindings(document),
    }).find((item) => item.builderId === "align-planned-dependency");

    expect(recommendation?.mode).toBe("automatic");
    expect(recommendation?.operations[0]?.operation).toEqual({
      type: "update-node",
      nodeId: "app",
      changes: { planned: true },
    });
  });

  it("falls back to manual review when there is no telemetry destination", () => {
    const document = buildDocument([{ id: "a" }, { id: "b" }], [["a", "b"]]);
    const recommendation = generateRecommendations({
      document,
      findings: buildFindings(document),
    }).find((item) => item.builderId === "connect-telemetry-coverage");

    expect(recommendation?.mode).toBe("manual-review");
    expect(recommendation?.operations).toEqual([]);
    expect(recommendation?.assumptions.join(" ")).toContain("will not invent a monitoring vendor");
  });
});

describe("recommendation language", () => {
  const FORBIDDEN = [
    /deploy/i,
    /apply to production/i,
    /infrastructure updated/i,
    /permanently fixed/i,
    /guaranteed to resolve/i,
  ];

  it("never implies a patch changes real infrastructure", () => {
    for (const recommendation of generate()) {
      const texts = [
        recommendation.title,
        recommendation.proposedChange,
        recommendation.rationale,
        recommendation.expectedEffect,
        ...recommendation.assumptions,
      ];
      for (const text of texts) {
        for (const pattern of FORBIDDEN) {
          expect(text).not.toMatch(pattern);
        }
      }
    }
  });

  it("tells automatic changes they are document-only and need review", () => {
    for (const recommendation of generate()) {
      if (recommendation.mode !== "automatic") continue;
      expect(recommendation.assumptions.join(" ")).toContain(
        "architecture-document change. Implementation still requires engineering review",
      );
    }
  });
});
