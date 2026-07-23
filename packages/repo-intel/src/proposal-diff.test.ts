import { describe, expect, it } from "vitest";

import { buildProposal } from "./proposal";
import { diffProposalComponents, componentIdentity } from "./proposal-diff";
import { type RepositoryEvidence } from "./schemas";

function evidence(technology: string, category: string, id: string): RepositoryEvidence {
  return {
    id,
    filePath: `${id}.json`,
    evidenceType: "dependency",
    extractor: "package-json",
    confidence: "low",
    fact: { technology, category },
  } as RepositoryEvidence;
}

const proposal = (evList: RepositoryEvidence[]) => buildProposal("org/repo", "sha", evList);

describe("diffProposalComponents", () => {
  it("reports a component only at head as added, and only at base as removed", () => {
    const base = proposal([evidence("PostgreSQL", "database", "e1")]);
    const head = proposal([evidence("Redis", "cache", "e2")]);

    const diff = diffProposalComponents(base, head);
    expect(diff.added.map((c) => c.name)).toEqual(["Redis"]);
    expect(diff.removed.map((c) => c.name)).toEqual(["PostgreSQL"]);
    expect(diff.modified).toHaveLength(0);
  });

  it("treats a component present at both commits as unchanged when confidence holds", () => {
    const base = proposal([evidence("PostgreSQL", "database", "e1")]);
    const head = proposal([evidence("PostgreSQL", "database", "e2")]);

    const diff = diffProposalComponents(base, head);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.unchanged.map((c) => c.name)).toEqual(["PostgreSQL"]);
  });

  it("flags a shared component whose confidence changed as modified", () => {
    const base = proposal([{ ...evidence("PostgreSQL", "database", "e1"), confidence: "low" }]);
    const head = proposal([
      { ...evidence("PostgreSQL", "database", "e2"), confidence: "confirmed" },
    ]);

    const diff = diffProposalComponents(base, head);
    expect(diff.modified.map((c) => c.name)).toEqual(["PostgreSQL"]);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it("keys identity case-insensitively on technology-or-name plus category", () => {
    const upper = proposal([evidence("PG", "database", "e1")]).components[0];
    const lower = proposal([evidence("pg", "database", "e2")]).components[0];
    if (upper === undefined || lower === undefined) throw new Error("expected a component");
    expect(componentIdentity(upper)).toBe(componentIdentity(lower));
  });
});
