import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/ready (readiness)", () => {
  it("reports ready in local mode without a database", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = (await response.json()) as { status: string; mode: string };
    expect(body).toEqual({ status: "ready", mode: "local" });
  });

  it("returns 503 without leaking detail when configuration is invalid", async () => {
    // Production without an explicit persistence mode is a config failure.
    vi.stubEnv("NODE_ENV", "production");
    const response = await GET();
    expect(response.status).toBe(503);
    const body = (await response.json()) as { status: string; reason: string };
    expect(body.status).toBe("not-ready");
    // No variable names, hostnames, or stack traces are exposed.
    expect(JSON.stringify(body)).not.toMatch(/postgres|host|password|DATABASE_URL|AXON_/);
  });
});
