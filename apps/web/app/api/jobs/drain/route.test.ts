import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The DB and the DB-touching drain are stubbed; drain behavior itself is covered
// by webhook-processor.test.ts. Here we assert the route's auth gate.
vi.mock("@/lib/server/db/client", () => ({ getDatabaseAsync: vi.fn(() => Promise.resolve({})) }));
const { drainWebhookJobs } = vi.hoisted(() => ({ drainWebhookJobs: vi.fn(() => Promise.resolve(3)) }));
vi.mock("@/lib/server/jobs/webhook-processor", () => ({ drainWebhookJobs }));

import { POST } from "./route";

const SECRET = "test-drain-secret";

function req(headers: Record<string, string> = {}): Request {
  return new Request("https://axon.test/api/jobs/drain", { method: "POST", headers });
}

beforeEach(() => {
  process.env.AXON_JOBS_DRAIN_SECRET = SECRET;
});
afterEach(() => {
  delete process.env.AXON_JOBS_DRAIN_SECRET;
  vi.clearAllMocks();
});

describe("POST /api/jobs/drain", () => {
  it("returns 503 and never drains when the secret is unset", async () => {
    delete process.env.AXON_JOBS_DRAIN_SECRET;
    const res = await POST(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(503);
    expect(drainWebhookJobs).not.toHaveBeenCalled();
  });

  it("rejects a missing bearer token", async () => {
    const res = await POST(req());
    expect(res.status).toBe(401);
    expect(drainWebhookJobs).not.toHaveBeenCalled();
  });

  it("rejects a wrong bearer token", async () => {
    const res = await POST(req({ authorization: "Bearer nope" }));
    expect(res.status).toBe(401);
    expect(drainWebhookJobs).not.toHaveBeenCalled();
  });

  it("does not accept the secret without the Bearer scheme", async () => {
    const res = await POST(req({ authorization: SECRET }));
    expect(res.status).toBe(401);
    expect(drainWebhookJobs).not.toHaveBeenCalled();
  });

  it("drains the queue and reports the count on a valid bearer", async () => {
    const res = await POST(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ran: 3 });
    expect(drainWebhookJobs).toHaveBeenCalledTimes(1);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
