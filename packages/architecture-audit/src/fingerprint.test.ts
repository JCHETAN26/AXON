import { describe, expect, it } from "vitest";

import { computeFingerprint, defaultFingerprintKey, fnv1aHex } from "./fingerprint";

describe("fnv1aHex", () => {
  it("is deterministic and 8 hex characters", () => {
    expect(fnv1aHex("single-point-of-failure|gateway")).toBe(
      fnv1aHex("single-point-of-failure|gateway"),
    );
    expect(fnv1aHex("anything")).toMatch(/^[0-9a-f]{8}$/);
    expect(fnv1aHex("")).toMatch(/^[0-9a-f]{8}$/);
  });

  it("differs for different inputs", () => {
    expect(fnv1aHex("rule-a|node-1")).not.toBe(fnv1aHex("rule-a|node-2"));
    expect(fnv1aHex("rule-a|node-1")).not.toBe(fnv1aHex("rule-b|node-1"));
  });
});

describe("computeFingerprint", () => {
  it("scopes the key by rule id so rules cannot collide", () => {
    expect(computeFingerprint("rule-a", "node-1")).not.toBe(computeFingerprint("rule-b", "node-1"));
  });
});

describe("defaultFingerprintKey", () => {
  it("is insensitive to element order", () => {
    expect(defaultFingerprintKey(["b", "a", "c"])).toBe(defaultFingerprintKey(["c", "a", "b"]));
    expect(defaultFingerprintKey(["b", "a", "c"])).toBe("a,b,c");
  });
});
