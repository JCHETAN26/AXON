import { expect, test } from "@playwright/test";

/**
 * Security-header verification across route classes. Runs against the dev
 * server; the production build applies the same headers (the only difference is
 * that `script-src` permits 'unsafe-eval' in development only).
 */

const REQUIRED = {
  "content-security-policy": /default-src 'self'.*object-src 'none'.*frame-ancestors 'none'/s,
  "x-content-type-options": /nosniff/,
  "x-frame-options": /DENY/,
  "referrer-policy": /strict-origin-when-cross-origin/,
  "strict-transport-security": /max-age=/,
  "cross-origin-opener-policy": /same-origin/,
};

for (const path of ["/", "/sign-in", "/api/health"]) {
  test(`security headers present on ${path}`, async ({ request }) => {
    const response = await request.get(path);
    const headers = response.headers();
    for (const [name, pattern] of Object.entries(REQUIRED)) {
      expect(headers[name], `${name} on ${path}`).toBeDefined();
      expect(headers[name]).toMatch(pattern);
    }
    // The CSP must never permit eval in a production-shaped policy assertion:
    // form-action and base-uri are locked to self.
    expect(headers["content-security-policy"]).toContain("form-action 'self'");
    expect(headers["content-security-policy"]).toContain("base-uri 'self'");
  });
}

test("health endpoint is reachable and reveals no secrets", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  const body = await response.text();
  expect(body).not.toMatch(/postgres|password|secret|DATABASE_URL|token/i);
});
