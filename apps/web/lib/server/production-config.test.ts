import { describe, expect, it } from "vitest";

import { assertDeploymentConfig, validateDeploymentConfig } from "./production-config";

const CLOUD_PROD = {
  NODE_ENV: "production",
  AXON_PERSISTENCE_MODE: "cloud",
  NEXT_PUBLIC_AXON_PERSISTENCE_MODE: "cloud",
  DATABASE_URL: "postgres://localhost/axon",
  AUTH_SECRET: "a-strong-32-character-minimum-secret-value",
  AUTH_GITHUB_ID: "id",
  AUTH_GITHUB_SECRET: "gh-client-secret",
  AXON_APP_URL: "https://axon.example.com",
  ANTHROPIC_API_KEY: "sk-ant-xxxxxxxxxxxxxxxxxxxx",
  AXON_LEGAL_COMPANY_NAME: "AXON Inc.",
  AXON_LEGAL_SUPPORT_EMAIL: "support@axon.example",
  AXON_LEGAL_PRIVACY_EMAIL: "privacy@axon.example",
  AXON_LEGAL_EFFECTIVE_DATE: "2026-07-21",
} as unknown as NodeJS.ProcessEnv;

describe("validateDeploymentConfig", () => {
  it("passes for a complete cloud production config", () => {
    expect(validateDeploymentConfig(CLOUD_PROD)).toEqual([]);
  });

  it("rejects the PGlite test driver in production", () => {
    const problems = validateDeploymentConfig({ ...CLOUD_PROD, AXON_DB_DRIVER: "pglite" });
    expect(problems.some((p) => p.variable === "AXON_DB_DRIVER")).toBe(true);
  });

  it("rejects a placeholder or too-short auth secret in production", () => {
    // An empty secret is caught by the persistence resolver; these are the
    // placeholder/too-short cases the dedicated check must catch.
    for (const secret of ["secret", "changeme", "short-secret"]) {
      const problems = validateDeploymentConfig({ ...CLOUD_PROD, AUTH_SECRET: secret });
      expect(problems.some((p) => p.variable === "AUTH_SECRET")).toBe(true);
    }
  });

  it("requires a valid application URL in production", () => {
    expect(
      validateDeploymentConfig({ ...CLOUD_PROD, AXON_APP_URL: "", AUTH_URL: "" }).some(
        (p) => p.variable === "AXON_APP_URL",
      ),
    ).toBe(true);
    expect(
      validateDeploymentConfig({ ...CLOUD_PROD, AXON_APP_URL: "not a url" }).some(
        (p) => p.variable === "AXON_APP_URL",
      ),
    ).toBe(true);
  });

  it("requires a provider credential when generation is enabled", () => {
    const withoutKey = { ...CLOUD_PROD, ANTHROPIC_API_KEY: "" };
    expect(
      validateDeploymentConfig(withoutKey as NodeJS.ProcessEnv).some(
        (p) => p.variable === "ANTHROPIC_API_KEY",
      ),
    ).toBe(true);
  });

  it("allows generation to be disabled without a provider credential", () => {
    const withoutKey = { ...CLOUD_PROD, ANTHROPIC_API_KEY: "" };
    const problems = validateDeploymentConfig({
      ...(withoutKey as NodeJS.ProcessEnv),
      AXON_GENERATION_ENABLED: "false",
    });
    expect(problems.some((p) => p.variable === "ANTHROPIC_API_KEY")).toBe(false);
  });

  it("treats an empty AXON_AI_PROVIDER as the default provider (not unknown)", () => {
    const problems = validateDeploymentConfig({ ...CLOUD_PROD, AXON_AI_PROVIDER: "" });
    expect(problems.some((p) => p.variable === "AXON_AI_PROVIDER")).toBe(false);
  });

  it("rejects an unknown AI model and non-positive limits", () => {
    expect(
      validateDeploymentConfig({ ...CLOUD_PROD, ANTHROPIC_MODEL: "gpt-9" }).some(
        (p) => p.variable === "ANTHROPIC_MODEL",
      ),
    ).toBe(true);
    expect(
      validateDeploymentConfig({ ...CLOUD_PROD, AXON_GENERATION_DAILY_LIMIT: "0" }).some(
        (p) => p.variable === "AXON_GENERATION_DAILY_LIMIT",
      ),
    ).toBe(true);
  });

  it("blocks production launch when legal/trust contact config is missing", () => {
    const withoutLegal = { ...CLOUD_PROD, AXON_LEGAL_SUPPORT_EMAIL: "" };
    const problems = validateDeploymentConfig(withoutLegal);
    expect(problems.some((p) => p.variable === "AXON_LEGAL_SUPPORT_EMAIL")).toBe(true);
  });

  it("flags an unset persistence mode in production (fail closed)", () => {
    const problems = validateDeploymentConfig({ NODE_ENV: "production" } as NodeJS.ProcessEnv);
    expect(problems.some((p) => p.variable === "AXON_PERSISTENCE_MODE")).toBe(true);
  });

  it("flags test authentication enabled in production", () => {
    const problems = validateDeploymentConfig({
      ...CLOUD_PROD,
      AXON_TEST_AUTH: "1",
    } as NodeJS.ProcessEnv);
    expect(problems.some((p) => p.variable === "AXON_TEST_AUTH")).toBe(true);
  });

  it("flags missing GitHub credentials in cloud production", () => {
    const withoutGithub = { ...CLOUD_PROD, AUTH_GITHUB_ID: "", AUTH_GITHUB_SECRET: "" };
    expect(
      validateDeploymentConfig(withoutGithub).some((p) => p.variable === "AUTH_GITHUB_ID"),
    ).toBe(true);
  });

  it("flags a mismatched public persistence flag", () => {
    const problems = validateDeploymentConfig({
      ...CLOUD_PROD,
      NEXT_PUBLIC_AXON_PERSISTENCE_MODE: "local",
    } as NodeJS.ProcessEnv);
    expect(problems.some((p) => p.variable === "NEXT_PUBLIC_AXON_PERSISTENCE_MODE")).toBe(true);
  });

  it("passes for local development", () => {
    expect(
      validateDeploymentConfig({
        NODE_ENV: "development",
        AXON_PERSISTENCE_MODE: "local",
      } as NodeJS.ProcessEnv),
    ).toEqual([]);
  });
});

describe("assertDeploymentConfig", () => {
  it("throws on an invalid configuration", () => {
    expect(() => assertDeploymentConfig({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toThrow(
      /deployment configuration/,
    );
  });

  it("does not throw on a valid one", () => {
    expect(() => assertDeploymentConfig(CLOUD_PROD)).not.toThrow();
  });
});
