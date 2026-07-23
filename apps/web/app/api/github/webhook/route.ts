import { getGithubWebhookSecret } from "@/lib/server/github/config";
import { recordWebhookDelivery, SUPPORTED_WEBHOOK_EVENTS } from "@/lib/server/github/webhook-service";
import { verifyWebhookSignature } from "@/lib/server/github/webhook-verify";
import { getDatabaseAsync } from "@/lib/server/db/client";
import { safeLog, type SafeLogFields } from "@/lib/server/logger";

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB

function ack(status: string, code = 202): Response {
  return new Response(JSON.stringify({ status }), {
    status: code,
    headers: { "content-type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Extracts safe metadata from a parsed webhook payload — never content. */
function extractMeta(eventType: string, deliveryId: string, body: Record<string, unknown>) {
  const installation = body.installation as { id?: number } | undefined;
  const repository = body.repository as { id?: number } | undefined;
  const pull = body.pull_request as { number?: number } | undefined;
  return {
    deliveryId,
    eventType,
    installationId: typeof installation?.id === "number" ? installation.id : null,
    repositoryGithubId: typeof repository?.id === "number" ? repository.id : null,
    prNumber:
      typeof pull?.number === "number"
        ? pull.number
        : typeof body.number === "number"
          ? (body.number as number)
          : null,
    beforeSha: typeof body.before === "string" ? (body.before as string) : null,
    afterSha: typeof body.after === "string" ? (body.after as string) : null,
  };
}

/**
 * GitHub App webhook receiver. Verifies the signature, enforces size/content
 * limits and an event allowlist, deduplicates by delivery id, records only safe
 * metadata, enqueues a background job for analysis events, and returns quickly.
 * The payload, secret, and any source content are never logged.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = getGithubWebhookSecret();
  if (secret === null) {
    // Webhooks are not configured on this server — reject rather than accept
    // unverifiable deliveries.
    return ack("disabled", 503);
  }

  if ((request.headers.get("content-type") ?? "").split(";")[0]?.trim() !== "application/json") {
    return ack("unsupported-media-type", 415);
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return ack("payload-too-large", 413);
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return ack("payload-too-large", 413);

  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    safeLog("warn", "github webhook rejected", { operation: "github.webhook", errorCode: "bad-signature" });
    return ack("invalid-signature", 401);
  }

  const eventType = request.headers.get("x-github-event") ?? "";
  const deliveryId = request.headers.get("x-github-delivery") ?? "";
  if (deliveryId === "" || eventType === "") return ack("missing-headers", 400);
  if (!SUPPORTED_WEBHOOK_EVENTS.has(eventType)) {
    return ack("ignored-event"); // acknowledged so GitHub does not retry
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return ack("invalid-json", 400);
  }

  const db = await getDatabaseAsync();
  const outcome = await recordWebhookDelivery(db, extractMeta(eventType, deliveryId, body));

  const fields: SafeLogFields = {
    operation: "github.webhook",
    status: outcome.kind === "queued" ? 202 : 200,
  };
  if (outcome.kind !== "queued") fields.errorCode = outcome.kind;
  safeLog("info", "github webhook processed", fields);
  return ack(outcome.kind);
}
