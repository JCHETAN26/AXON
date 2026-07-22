import { describe, expect, it } from "vitest";

import { scanTextForSecrets } from "./bundle-scan";
import { assertVerificationAllowed, verificationPrefix } from "./postgres-guard";

describe("assertVerificationAllowed", () => {
  it("refuses without the explicit staging mode", () => {
    const result = assertVerificationAllowed({
      DATABASE_URL: "postgres://x",
    } as unknown as NodeJS.ProcessEnv);
    expect(result.ok).toBe(false);
  });

  it("refuses without a DATABASE_URL", () => {
    expect(
      assertVerificationAllowed({
        AXON_VERIFICATION_MODE: "staging",
      } as unknown as NodeJS.ProcessEnv).ok,
    ).toBe(false);
  });

  it("allows a staging target", () => {
    const result = assertVerificationAllowed({
      AXON_VERIFICATION_MODE: "staging",
      DATABASE_URL: "postgres://localhost/axon_staging",
    } as unknown as NodeJS.ProcessEnv);
    expect(result.ok).toBe(true);
  });

  it("refuses a production-like target without the destructive confirmation", () => {
    const result = assertVerificationAllowed({
      AXON_VERIFICATION_MODE: "staging",
      DATABASE_URL: "postgres://prod-db/axon",
      NODE_ENV: "production",
    } as unknown as NodeJS.ProcessEnv);
    expect(result.ok).toBe(false);
  });

  it("allows a production target only with the explicit destructive flag", () => {
    const result = assertVerificationAllowed({
      AXON_VERIFICATION_MODE: "staging",
      DATABASE_URL: "postgres://prod-db/axon",
      NODE_ENV: "production",
      AXON_VERIFICATION_ALLOW_DESTRUCTIVE: "yes-i-understand",
    } as unknown as NodeJS.ProcessEnv);
    expect(result.ok).toBe(true);
  });

  it("generates unique record prefixes", () => {
    expect(verificationPrefix()).not.toBe(verificationPrefix());
    expect(verificationPrefix()).toMatch(/^axon-verify-/);
  });
});

describe("scanTextForSecrets", () => {
  const env = {
    DATABASE_URL: "postgres://user:supersecretpassword@db.example/axon",
    AUTH_SECRET: "a-strong-32-character-minimum-secret-value",
    AUTH_GITHUB_SECRET: "gh-oauth-client-secret-value-1234",
    AUTH_GITHUB_ID: "public-github-client-id",
    ANTHROPIC_API_KEY: "sk-ant-abcdefghijklmnop1234",
  } as unknown as NodeJS.ProcessEnv;

  it("detects a leaked server secret value and reports only a fingerprint", () => {
    const findings = scanTextForSecrets(
      "chunk.js",
      `const s = "a-strong-32-character-minimum-secret-value";`,
      env,
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.source).toBe("AUTH_SECRET");
    // The actual value is never included.
    expect(JSON.stringify(findings)).not.toContain("minimum-secret-value");
    expect(findings[0]?.fingerprint).toMatch(/^[0-9a-f]{12}$/);
  });

  it("detects secret-shaped patterns", () => {
    const findings = scanTextForSecrets("chunk.js", "key = sk-ant-abcdefghijklmnop1234", env);
    expect(findings.some((f) => f.source === "anthropic-api-key")).toBe(true);
  });

  it("does not flag the public GitHub client id", () => {
    const findings = scanTextForSecrets("chunk.js", `id = "public-github-client-id"`, env);
    expect(findings).toEqual([]);
  });

  it("returns nothing for clean output", () => {
    expect(scanTextForSecrets("chunk.js", "const x = 1; export default x;", env)).toEqual([]);
  });
});
