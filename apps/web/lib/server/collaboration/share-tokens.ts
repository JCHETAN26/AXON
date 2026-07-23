import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export interface ShareToken {
  readonly rawToken: string;
  readonly tokenHash: string;
}

export function hashShareToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function createShareToken(): ShareToken {
  const rawToken = randomBytes(32).toString("base64url");
  return { rawToken, tokenHash: hashShareToken(rawToken) };
}

export function verifyShareToken(rawToken: string, tokenHash: string): boolean {
  const candidate = Buffer.from(hashShareToken(rawToken), "hex");
  const expected = Buffer.from(tokenHash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
