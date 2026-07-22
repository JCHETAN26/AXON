import { afterEach, describe, expect, it, vi } from "vitest";

import { isSafeRedirect, isTestAuthEnabled } from "./auth-helpers";

describe("isSafeRedirect", () => {
  const base = "https://axon.example.com";

  it("allows same-origin path-relative targets", () => {
    expect(isSafeRedirect("/projects", base)).toBe(true);
    expect(isSafeRedirect("/projects/abc", base)).toBe(true);
  });

  it("allows same-origin absolute targets", () => {
    expect(isSafeRedirect("https://axon.example.com/projects", base)).toBe(true);
  });

  it("rejects open redirects to other origins", () => {
    expect(isSafeRedirect("https://evil.example.com", base)).toBe(false);
    expect(isSafeRedirect("//evil.example.com", base)).toBe(false);
    expect(isSafeRedirect("http://axon.example.com.evil.com", base)).toBe(false);
  });
});

describe("isTestAuthEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is enabled only outside production when the flag is set", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("AXON_TEST_AUTH", "1");
    expect(isTestAuthEnabled()).toBe(true);
  });

  it("fails closed in production even with the flag set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AXON_TEST_AUTH", "1");
    expect(isTestAuthEnabled()).toBe(false);
  });

  it("is disabled without the flag", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AXON_TEST_AUTH", "");
    expect(isTestAuthEnabled()).toBe(false);
  });
});
