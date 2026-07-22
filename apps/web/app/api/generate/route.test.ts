// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "./route";

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/generate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/generate", () => {
  const previousMode = process.env.AXON_GENERATION_MODE;

  beforeEach(() => {
    process.env.AXON_GENERATION_MODE = "offline";
  });

  afterEach(() => {
    if (previousMode === undefined) {
      delete process.env.AXON_GENERATION_MODE;
    } else {
      process.env.AXON_GENERATION_MODE = previousMode;
    }
  });

  it("generates a validated draft in offline mode", async () => {
    const response = await POST(
      jsonRequest({ prompt: "A SaaS platform with billing and background jobs" }),
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      draft: { nodes: unknown[]; edges: unknown[] };
      providerId: string;
      attempts: number;
      mode: string;
    };
    expect(payload.mode).toBe("offline");
    expect(payload.providerId).toBe("offline-template");
    expect(payload.attempts).toBe(1);
    expect(payload.draft.nodes.length).toBeGreaterThanOrEqual(3);
    expect(payload.draft.edges.length).toBeGreaterThanOrEqual(1);
  });

  it("rejects prompts that are too short", async () => {
    const response = await POST(jsonRequest({ prompt: "short" }));
    expect(response.status).toBe(400);
  });

  it("rejects a missing JSON content type", async () => {
    // Request hardening: a body without application/json is rejected (415)
    // before it reaches the handler, blocking simple cross-site form posts.
    const response = await POST(
      new Request("http://localhost/api/generate", { method: "POST", body: "not json" }),
    );
    expect(response.status).toBe(415);
  });

  it("rejects invalid JSON with a correct content type", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json",
      }),
    );
    expect(response.status).toBe(400);
  });

  it("rejects a non-POST method", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate", {
        method: "GET",
        headers: { "content-type": "application/json" },
      }),
    );
    expect(response.status).toBe(405);
  });
});
