import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/health (liveness)", () => {
  it("returns ok with a version and no infrastructure detail", async () => {
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = (await response.json()) as { status: string; version: string };
    expect(body.status).toBe("ok");
    expect(typeof body.version).toBe("string");
    expect(JSON.stringify(body)).not.toMatch(/postgres|database|mode|url/i);
  });
});
