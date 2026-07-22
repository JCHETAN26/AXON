import { describe, expect, it } from "vitest";

import { previewPatch } from "./apply-patch";
import { evaluateApplicability } from "./applicability";
import { generateRecommendations } from "./generate-recommendations";
import { buildFindings, buildSampleLikeDocument } from "./test-support/fixtures";
import { type Recommendation } from "./types";

const DOCUMENT = buildSampleLikeDocument();
const RECOMMENDATIONS = generateRecommendations({
  document: DOCUMENT,
  findings: buildFindings(DOCUMENT),
});

function byBuilder(builderId: string): Recommendation {
  const found = RECOMMENDATIONS.find((item) => item.builderId === builderId);
  if (found === undefined) throw new Error(`missing recommendation ${builderId}`);
  return found;
}

describe("evaluateApplicability", () => {
  it("marks a fresh automatic recommendation ready", () => {
    const result = evaluateApplicability({
      recommendation: byBuilder("add-dead-letter-path"),
      document: DOCUMENT,
      auditIsStale: false,
    });
    expect(result.status).toBe("ready");
    expect(result.canApply).toBe(true);
  });

  it("never allows applying a manual-review recommendation", () => {
    const result = evaluateApplicability({
      recommendation: byBuilder("review-single-point-of-failure"),
      document: DOCUMENT,
      auditIsStale: false,
    });
    expect(result.status).toBe("manual-review");
    expect(result.canApply).toBe(false);
  });

  it("refuses to apply when the audit is stale", () => {
    const result = evaluateApplicability({
      recommendation: byBuilder("add-dead-letter-path"),
      document: DOCUMENT,
      auditIsStale: true,
    });
    expect(result.status).toBe("stale");
    expect(result.canApply).toBe(false);
    expect(result.reasons[0]).toContain("Rerun the audit");
  });

  it("reports already-applied instead of duplicating work", () => {
    const recommendation = byBuilder("add-dead-letter-path");
    const preview = previewPatch(
      DOCUMENT,
      recommendation.operations.map((item) => item.operation),
      "2026-02-01T00:00:00.000Z",
    );
    if (!preview.ok) throw new Error("expected success");

    const result = evaluateApplicability({
      recommendation,
      document: preview.document,
      auditIsStale: false,
    });
    expect(result.status).toBe("already-applied");
    expect(result.canApply).toBe(false);
  });

  it("honours a persisted applied record even before the document is re-read", () => {
    const result = evaluateApplicability({
      recommendation: byBuilder("add-dead-letter-path"),
      document: DOCUMENT,
      auditIsStale: false,
      alreadyApplied: true,
    });
    expect(result.status).toBe("already-applied");
  });

  it("reports a conflict when a referenced component was deleted", () => {
    const recommendation = byBuilder("add-dead-letter-path");
    const withoutBroker = {
      ...DOCUMENT,
      nodes: DOCUMENT.nodes.filter((node) => node.id !== "rabbitmq"),
      edges: DOCUMENT.edges.filter(
        (edge) => edge.source !== "rabbitmq" && edge.target !== "rabbitmq",
      ),
    };
    const result = evaluateApplicability({
      recommendation,
      document: withoutBroker,
      auditIsStale: false,
    });
    expect(result.status).toBe("conflicted");
    expect(result.canApply).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("puts staleness ahead of every other check", () => {
    // Even an already-applied recommendation reports stale first, so a stale
    // audit can never produce an apply action of any kind.
    const result = evaluateApplicability({
      recommendation: byBuilder("add-dead-letter-path"),
      document: DOCUMENT,
      auditIsStale: true,
      alreadyApplied: true,
    });
    expect(result.status).toBe("stale");
  });
});
