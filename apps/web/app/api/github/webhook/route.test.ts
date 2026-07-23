import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as WebhookServiceModule from "@/lib/server/github/webhook-service";

// The DB and the DB-touching service are stubbed; the DB-integration behavior is
// covered by webhook-service.test.ts. Here we assert the route's security gates.
vi.mock("@/lib/server/db/client", () => ({ getDatabaseAsync: vi.fn(() => Promise.resolve({})) }));
vi.mock("@/lib/server/github/webhook-service", async (importActual) => {
  const actual = await importActual<typeof WebhookServiceModule>();
  return {
    ...actual,
    recordWebhookDelivery: vi.fn(() =>
      Promise.resolve({ kind: "queued", jobId: "j1", ownerId: "o1" }),
    ),
  };
});

import { POST } from "./route";

const SECRET = "test-webhook-secret";

function sign(body: string): string {
  return `sha256=${createHmac("sha256", SECRET).update(body, "utf8").digest("hex")}`;
}

function req(
  body: string,
  headers: Record<string, string>,
): Request {
  return new Request("https://axon.test/api/github/webhook", { method: "POST", body, headers });
}

const jsonHeaders = (extra: Record<string, string>): Record<string, string> => ({
  "content-type": "application/json",
  ...extra,
});

beforeEach(() => {
  process.env.GITHUB_APP_WEBHOOK_SECRET = SECRET;
});
afterEach(() => {
  delete process.env.GITHUB_APP_WEBHOOK_SECRET;
  vi.clearAllMocks();
});

describe("POST /api/github/webhook", () => {
  it("returns 503 when no webhook secret is configured", async () => {
    delete process.env.GITHUB_APP_WEBHOOK_SECRET;
    const res = await POST(req("{}", jsonHeaders({})));
    expect(res.status).toBe(503);
  });

  it("rejects a non-JSON content type", async () => {
    const res = await POST(req("{}", { "content-type": "text/plain" }));
    expect(res.status).toBe(415);
  });

  it("rejects an invalid signature", async () => {
    const body = JSON.stringify({ action: "opened" });
    const res = await POST(
      req(body, jsonHeaders({ "x-hub-signature-256": "sha256=deadbeef", "x-github-event": "pull_request", "x-github-delivery": "d1" })),
    );
    expect(res.status).toBe(401);
  });

  it("rejects a missing signature", async () => {
    const body = JSON.stringify({ action: "opened" });
    const res = await POST(
      req(body, jsonHeaders({ "x-github-event": "pull_request", "x-github-delivery": "d1" })),
    );
    expect(res.status).toBe(401);
  });

  it("rejects an oversized declared body", async () => {
    const res = await POST(
      req("{}", jsonHeaders({ "content-length": String(6 * 1024 * 1024) })),
    );
    expect(res.status).toBe(413);
  });

  it("acknowledges (202) an unsupported event without processing", async () => {
    const body = JSON.stringify({ zen: "hi" });
    const res = await POST(
      req(body, jsonHeaders({ "x-hub-signature-256": sign(body), "x-github-event": "ping", "x-github-delivery": "d1" })),
    );
    expect(res.status).toBe(202);
    expect((await res.json()).status).toBe("ignored-event");
  });

  it("requires the delivery and event headers on a signed request", async () => {
    const body = JSON.stringify({ action: "opened" });
    const res = await POST(req(body, jsonHeaders({ "x-hub-signature-256": sign(body) })));
    expect(res.status).toBe(400);
  });

  it("accepts a valid, signed, supported delivery (202)", async () => {
    const body = JSON.stringify({ action: "opened", pull_request: { number: 7 }, installation: { id: 100 }, repository: { id: 555 } });
    const res = await POST(
      req(body, jsonHeaders({ "x-hub-signature-256": sign(body), "x-github-event": "pull_request", "x-github-delivery": "d1" })),
    );
    expect(res.status).toBe(202);
    expect((await res.json()).status).toBe("queued");
  });
});
