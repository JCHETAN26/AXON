import { describe, expect, it } from "vitest";

import {
  BENCHMARK_CORPUS_VERSION,
  REPOSITORY_BENCHMARK_CORPUS,
  scoreRepositoryBenchmark,
} from "./benchmark-corpus";

describe("repository benchmark corpus", () => {
  it("is versioned and includes malicious fixtures with ground truth", () => {
    expect(BENCHMARK_CORPUS_VERSION).toBe("2026.07.fixture-v1");
    expect(REPOSITORY_BENCHMARK_CORPUS.some((fixture) => fixture.category === "malicious")).toBe(
      true,
    );
    expect(
      REPOSITORY_BENCHMARK_CORPUS.flatMap((fixture) => fixture.expectedSecretsRedacted),
    ).toContain("AWS_SECRET_ACCESS_KEY");
  });

  it("scores component and relationship precision and recall", () => {
    const fixture = REPOSITORY_BENCHMARK_CORPUS.find(
      (candidate) => candidate.id === "typescript-api-postgres",
    );
    if (fixture === undefined) throw new Error("fixture missing");

    const score = scoreRepositoryBenchmark(fixture, {
      components: [{ id: "api" }, { id: "cache" }],
      relationships: [{ source: "api", target: "postgres", kind: "data" }],
    });

    expect(score.corpusVersion).toBe(BENCHMARK_CORPUS_VERSION);
    expect(score.components.precision).toBe(0.5);
    expect(score.components.recall).toBe(0.5);
    expect(score.relationships.precision).toBe(1);
    expect(score.relationships.recall).toBe(1);
  });
});
