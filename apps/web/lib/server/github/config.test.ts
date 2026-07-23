import { describe, expect, it } from "vitest";

import { getGithubAppConfig, githubInstallUrl, isGithubAppConfigured } from "./config";

const PEM = "-----BEGIN RSA PRIVATE KEY-----\nMIIabc\n-----END RSA PRIVATE KEY-----";

const COMPLETE = {
  GITHUB_APP_ID: "123456",
  GITHUB_APP_CLIENT_ID: "Iv1.abcdef",
  GITHUB_APP_CLIENT_SECRET: "gh-app-secret",
  GITHUB_APP_PRIVATE_KEY: PEM,
  GITHUB_APP_SLUG: "axon-repo-intel",
  AXON_APP_URL: "http://localhost:3000",
} as unknown as NodeJS.ProcessEnv;

describe("github config", () => {
  it("returns null when unconfigured", () => {
    expect(getGithubAppConfig({} as NodeJS.ProcessEnv)).toBeNull();
    expect(isGithubAppConfigured({} as NodeJS.ProcessEnv)).toBe(false);
  });

  it("resolves a complete configuration", () => {
    const config = getGithubAppConfig(COMPLETE);
    expect(config?.appId).toBe("123456");
    expect(config?.slug).toBe("axon-repo-intel");
    expect(isGithubAppConfigured(COMPLETE)).toBe(true);
  });

  it("normalizes an escaped-newline private key", () => {
    const config = getGithubAppConfig({
      ...COMPLETE,
      GITHUB_APP_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\\nMIIabc\\n-----END PRIVATE KEY-----",
    });
    expect(config?.privateKey).toContain("\n");
    expect(config?.privateKey).not.toContain("\\n");
  });

  it("rejects a placeholder value", () => {
    expect(getGithubAppConfig({ ...COMPLETE, GITHUB_APP_SLUG: "your-app-slug" })).toBeNull();
  });

  it("rejects a private key that is not a PEM", () => {
    expect(getGithubAppConfig({ ...COMPLETE, GITHUB_APP_PRIVATE_KEY: "not-a-key" })).toBeNull();
  });

  it("builds the installation URL from the slug", () => {
    const config = getGithubAppConfig(COMPLETE);
    if (config === null) throw new Error("expected a config");
    expect(githubInstallUrl(config)).toBe(
      "https://github.com/apps/axon-repo-intel/installations/new",
    );
  });
});
