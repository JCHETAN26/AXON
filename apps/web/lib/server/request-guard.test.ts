import { afterEach, describe, expect, it, vi } from "vitest";

import {
  guardMutation,
  privateJson,
  readJsonBounded,
  requireJsonContentType,
  requireMethod,
  requireSameOrigin,
} from "./request-guard";

function request(init: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}): Request {
  return new Request("https://axon.example.com/api/projects", {
    method: init.method ?? "POST",
    ...(init.headers !== undefined && { headers: init.headers }),
    ...(init.body !== undefined && { body: init.body }),
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireMethod", () => {
  it("rejects a disallowed method with 405", () => {
    expect(requireMethod(request({ method: "GET" }), ["POST"])?.response.status).toBe(405);
  });
  it("allows an allowed method", () => {
    expect(requireMethod(request({ method: "POST" }), ["POST"])).toBeNull();
  });
});

describe("requireJsonContentType", () => {
  it("rejects a form content type with 415", () => {
    const failure = requireJsonContentType(
      request({ headers: { "content-type": "application/x-www-form-urlencoded" } }),
    );
    expect(failure?.response.status).toBe(415);
  });
  it("accepts application/json", () => {
    expect(
      requireJsonContentType(request({ headers: { "content-type": "application/json" } })),
    ).toBeNull();
  });
});

describe("requireSameOrigin", () => {
  it("accepts a same-origin request (Origin host matches Host)", () => {
    expect(
      requireSameOrigin(
        request({ headers: { origin: "https://axon.example.com", host: "axon.example.com" } }),
      ),
    ).toBeNull();
  });
  it("rejects a cross-origin request with 403", () => {
    const failure = requireSameOrigin(
      request({ headers: { origin: "https://evil.example.com", host: "axon.example.com" } }),
    );
    expect(failure?.response.status).toBe(403);
  });
  it("allows a missing Origin (non-browser client)", () => {
    expect(requireSameOrigin(request({ headers: { host: "axon.example.com" } }))).toBeNull();
  });
  it("honours the configured app URL host", () => {
    vi.stubEnv("AXON_APP_URL", "https://app.axon.io");
    expect(
      requireSameOrigin(
        request({ headers: { origin: "https://app.axon.io", host: "internal:3000" } }),
      ),
    ).toBeNull();
  });
});

describe("readJsonBounded", () => {
  it("rejects an oversized declared body with 413", async () => {
    const result = await readJsonBounded(
      request({ headers: { "content-length": "999999" }, body: "{}" }),
      10,
    );
    expect("response" in result && result.response.status).toBe(413);
  });
  it("rejects invalid JSON with 400", async () => {
    const result = await readJsonBounded(request({ body: "{not json" }));
    expect("response" in result && result.response.status).toBe(400);
  });
  it("parses a valid body", async () => {
    const result = await readJsonBounded(request({ body: JSON.stringify({ a: 1 }) }));
    expect("ok" in result && result.value).toEqual({ a: 1 });
  });
});

describe("guardMutation", () => {
  it("passes a valid same-origin JSON request", async () => {
    const result = await guardMutation(
      request({
        headers: {
          origin: "https://axon.example.com",
          host: "axon.example.com",
          "content-type": "application/json",
        },
        body: JSON.stringify({ ok: true }),
      }),
      { methods: ["POST"] },
    );
    expect("ok" in result && result.body).toEqual({ ok: true });
  });

  it("rejects cross-origin before parsing", async () => {
    const result = await guardMutation(
      request({
        headers: {
          origin: "https://evil.com",
          host: "axon.example.com",
          "content-type": "application/json",
        },
        body: "{}",
      }),
      { methods: ["POST"] },
    );
    expect("response" in result && result.response.status).toBe(403);
  });
});

describe("privateJson", () => {
  it("sets no-store", () => {
    expect(privateJson({ a: 1 }).headers.get("Cache-Control")).toBe("no-store");
  });
});
