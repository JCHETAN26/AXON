import { describe, expect, it, vi } from "vitest";

import { safeLog, sanitizeLogFields } from "./logger";

describe("sanitizeLogFields", () => {
  it("keeps only allowlisted primitive fields", () => {
    expect(
      sanitizeLogFields({
        requestId: "r1",
        projectId: "p1",
        operation: "save",
        durationMs: 12,
        status: 200,
      }),
    ).toEqual({ requestId: "r1", projectId: "p1", operation: "save", durationMs: 12, status: 200 });
  });

  it("drops sensitive fields even if provided", () => {
    const result = sanitizeLogFields({
      requestId: "r1",
      prompt: "design a system",
      architectureDocument: { nodes: [] },
      composeYaml: "services: {}",
      authToken: "ghp_secret",
      sessionToken: "abc",
      inviteCode: "INV-1",
      feedbackBody: "hello",
      email: "user@example.com",
      DATABASE_URL: "postgres://x",
    });
    expect(result).toEqual({ requestId: "r1" });
  });

  it("drops non-primitive values (no nested objects leak)", () => {
    const result = sanitizeLogFields({ projectId: { nested: true } });
    expect(result).toEqual({});
  });
});

describe("safeLog", () => {
  it("emits a JSON line containing only safe fields", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    safeLog("info", "generation", {
      requestId: "r1",
      provider: "anthropic",
      model: "claude-opus-4-8",
      tokenCount: 42,
    });
    const line = spy.mock.calls[0]?.[0] as string;
    expect(JSON.parse(line)).toMatchObject({
      level: "info",
      message: "generation",
      provider: "anthropic",
      tokenCount: 42,
    });
    spy.mockRestore();
  });

  it("routes error level to console.error and never includes a body", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    safeLog("error", "generation-failed", {
      errorCode: "provider-error",
      status: 502,
      // A stray sensitive field must not survive.
      ...({ responseBody: "SECRET" } as unknown as Record<string, never>),
    });
    const line = spy.mock.calls[0]?.[0] as string;
    expect(line).not.toContain("SECRET");
    expect(JSON.parse(line)).toMatchObject({ errorCode: "provider-error", status: 502 });
    spy.mockRestore();
  });
});
