import { describe, expect, it } from "vitest";

import { createShareToken, hashShareToken, verifyShareToken } from "./share-tokens";

describe("share tokens", () => {
  it("stores only a deterministic hash of the raw token", () => {
    const raw = "external-link-token";
    expect(hashShareToken(raw)).toHaveLength(64);
    expect(hashShareToken(raw)).toBe(hashShareToken(raw));
    expect(hashShareToken(raw)).not.toContain(raw);
  });

  it("creates high-entropy non-recoverable tokens", () => {
    const first = createShareToken();
    const second = createShareToken();
    expect(first.rawToken).not.toBe(second.rawToken);
    expect(first.tokenHash).toBe(hashShareToken(first.rawToken));
    expect(first.tokenHash).not.toContain(first.rawToken);
  });

  it("verifies tokens using their hash", () => {
    const token = createShareToken();
    expect(verifyShareToken(token.rawToken, token.tokenHash)).toBe(true);
    expect(verifyShareToken("wrong", token.tokenHash)).toBe(false);
  });
});
