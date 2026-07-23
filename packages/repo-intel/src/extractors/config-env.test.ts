import { describe, it, expect } from "vitest";
import { extractConfigEnv } from "./config-env";

describe("extractConfigEnv", () => {
  it("extracts environment variable names mapping to technology", () => {
    const envFile = `
DATABASE_URL=postgres://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379
AWS_ACCESS_KEY_ID=12345
SOME_OTHER_VAR=value
`;
    const evidence = extractConfigEnv(".env", envFile);
    expect(evidence).toHaveLength(4);

    const pgEvidence = evidence.find(e => e.fact.name === "DATABASE_URL");
    expect(pgEvidence?.fact.technology).toBe("PostgreSQL");

    const redisEvidence = evidence.find(e => e.fact.name === "REDIS_URL");
    expect(redisEvidence?.fact.technology).toBe("Redis");

    const awsEvidence = evidence.find(e => e.fact.name === "AWS_ACCESS_KEY_ID");
    expect(awsEvidence?.fact.technology).toBe("AWS");

    const otherEvidence = evidence.find(e => e.fact.name === "SOME_OTHER_VAR");
    expect(otherEvidence?.fact.technology).toBeUndefined();
    expect(otherEvidence?.confidence).toBe("low");
  });
});
