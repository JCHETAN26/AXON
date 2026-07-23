import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { verifyWebhookSignature } from "./webhook-verify";

const SECRET = "webhook-secret-value";
const BODY = JSON.stringify({ action: "opened", number: 7 });

function sign(body: string, secret = SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

describe("verifyWebhookSignature", () => {
  it("accepts a correct signature", () => {
    expect(verifyWebhookSignature(BODY, sign(BODY), SECRET)).toBe(true);
  });

  it("rejects a signature made with the wrong secret", () => {
    expect(verifyWebhookSignature(BODY, sign(BODY, "other-secret"), SECRET)).toBe(false);
  });

  it("rejects a tampered body", () => {
    expect(verifyWebhookSignature(BODY + " ", sign(BODY), SECRET)).toBe(false);
  });

  it("rejects a missing or malformed signature", () => {
    expect(verifyWebhookSignature(BODY, null, SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, "", SECRET)).toBe(false);
    expect(verifyWebhookSignature(BODY, "deadbeef", SECRET)).toBe(false);
  });

  it("rejects the legacy sha1 algorithm", () => {
    const sha1 = `sha1=${createHmac("sha1", SECRET).update(BODY).digest("hex")}`;
    expect(verifyWebhookSignature(BODY, sha1, SECRET)).toBe(false);
  });

  it("rejects when no secret is configured", () => {
    expect(verifyWebhookSignature(BODY, sign(BODY), "")).toBe(false);
  });
});
