import { describe, expect, it } from "vitest";

import {
  PROXY_PROTECTED_PREFIXES,
  PROXY_PUBLIC_PREFIXES,
  ROUTE_MATRIX,
  isSafeReturnPath,
} from "./route-matrix";

describe("route-protection matrix", () => {
  it("marks marketing and legal routes public", () => {
    for (const path of ["/", "/privacy", "/terms", "/security", "/data-handling"]) {
      const entry = ROUTE_MATRIX.find((route) => route.pattern === path);
      expect(entry?.class).toBe("public");
      expect(entry?.proxyProtected).toBe(false);
    }
  });

  it("gates every product page behind the proxy", () => {
    for (const entry of ROUTE_MATRIX.filter((route) => route.class === "beta-page")) {
      expect(entry.proxyProtected).toBe(true);
      expect(PROXY_PROTECTED_PREFIXES.some((prefix) => entry.pattern.startsWith(prefix))).toBe(
        true,
      );
    }
  });

  it("has every owner API independently enforce authorization", () => {
    for (const entry of ROUTE_MATRIX.filter((route) => route.class === "owner-api")) {
      expect(entry.apiEnforced).toBe(true);
    }
  });

  it("keeps auth callbacks and health reachable without protection", () => {
    for (const entry of ROUTE_MATRIX.filter(
      (route) => route.class === "auth-callback" || route.class === "health",
    )) {
      expect(entry.proxyProtected).toBe(false);
      expect(PROXY_PUBLIC_PREFIXES.some((prefix) => entry.pattern.startsWith(prefix))).toBe(true);
    }
  });

  it("never marks a product page public or a public route gated", () => {
    for (const entry of ROUTE_MATRIX) {
      if (entry.class === "public" || entry.class === "auth" || entry.class === "health") {
        expect(entry.proxyProtected).toBe(false);
      }
      if (entry.class === "beta-page") {
        expect(entry.class).not.toBe("public");
      }
    }
  });

  it("marks internal APIs as enforced (they fail closed in production)", () => {
    const dev = ROUTE_MATRIX.find((route) => route.pattern === "/api/dev/seed-invite");
    expect(dev?.class).toBe("internal-api");
    expect(dev?.apiEnforced).toBe(true);
  });

  it("marks the job-drain route as secret-enforced, session-free, and edge-public", () => {
    const drain = ROUTE_MATRIX.find((route) => route.pattern === "/api/jobs/drain");
    expect(drain?.class).toBe("cron");
    expect(drain?.apiEnforced).toBe(true);
    expect(drain?.proxyProtected).toBe(false);
    // The scheduler has no session; the edge proxy must let it through so the
    // route's own bearer-secret check is the sole gate.
    expect(PROXY_PUBLIC_PREFIXES.some((prefix) => "/api/jobs/drain".startsWith(prefix))).toBe(true);
  });

  it("marks share-link routes as token-enforced but not proxy protected", () => {
    for (const pattern of ["/share/[token]", "/api/share/[token]"]) {
      const entry = ROUTE_MATRIX.find((route) => route.pattern === pattern);
      expect(entry?.class).toBe("share-link");
      expect(entry?.proxyProtected).toBe(false);
      expect(entry?.apiEnforced).toBe(true);
    }
  });

  it("enforces authorization on every connection API and the install callback", () => {
    for (const entry of ROUTE_MATRIX.filter((route) =>
      route.pattern.startsWith("/api/connections"),
    )) {
      expect(entry.apiEnforced).toBe(true);
    }
    const callback = ROUTE_MATRIX.find(
      (route) => route.pattern === "/api/connections/github/callback",
    );
    expect(callback?.class).toBe("github-callback");
  });
});

describe("isSafeReturnPath", () => {
  it("accepts same-origin relative paths", () => {
    expect(isSafeReturnPath("/projects")).toBe(true);
    expect(isSafeReturnPath("/projects/abc?x=1")).toBe(true);
  });

  it("rejects empty, absolute, and protocol-relative targets", () => {
    expect(isSafeReturnPath(null)).toBe(false);
    expect(isSafeReturnPath("")).toBe(false);
    expect(isSafeReturnPath("https://evil.com")).toBe(false);
    expect(isSafeReturnPath("//evil.com")).toBe(false);
    expect(isSafeReturnPath("http://axon.internal.evil.com")).toBe(false);
  });

  it("rejects backslash and encoded-bypass tricks", () => {
    expect(isSafeReturnPath("/\\evil.com")).toBe(false);
    expect(isSafeReturnPath("/%2f%2fevil.com")).toBe(false);
    expect(isSafeReturnPath("/%5c%5cevil.com")).toBe(false);
    expect(isSafeReturnPath("\\\\evil.com")).toBe(false);
  });
});
