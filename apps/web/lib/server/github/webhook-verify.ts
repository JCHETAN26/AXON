import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a GitHub webhook signature (`X-Hub-Signature-256: sha256=<hex>`)
 * against the raw request body using the configured webhook secret. Comparison
 * is timing-safe. Returns false for a missing/malformed signature, an
 * unsupported algorithm, or an absent secret — the caller rejects those.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  secret: string,
): boolean {
  if (secret.length === 0 || typeof signatureHeader !== "string") return false;
  const eq = signatureHeader.indexOf("=");
  if (eq <= 0) return false;
  const algorithm = signatureHeader.slice(0, eq);
  const provided = signatureHeader.slice(eq + 1);
  // Only sha256 is accepted; the legacy sha1 header is rejected.
  if (algorithm !== "sha256" || provided.length === 0) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}
