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
