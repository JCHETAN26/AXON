import { createHash, timingSafeEqual } from "node:crypto";

import { getDatabaseAsync } from "@/lib/server/db/client";
import { getJobsDrainSecret } from "@/lib/server/jobs/config";
import { drainWebhookJobs } from "@/lib/server/jobs/webhook-processor";
import { safeLog } from "@/lib/server/logger";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Constant-time bearer comparison over fixed-length hashes (no length leak). */
function bearerMatches(presented: string, expected: string): boolean {
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Drains queued webhook jobs. AXON runs no always-on worker loop; an external
 * scheduler (cron) POSTs here on an interval to process the background queue.
 * Authenticated only by a shared bearer secret — no user session. Disabled
 * (503) when the secret is unset, so it can never be an open trigger.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = getJobsDrainSecret();
  if (secret === null) {
    return json({ error: "Job drain is not configured." }, 503);
  }

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";
  if (presented === "" || !bearerMatches(presented, secret)) {
    safeLog("warn", "job drain rejected", { operation: "jobs.drain", errorCode: "unauthorized" });
    return json({ error: "Unauthorized." }, 401);
  }

  const db = await getDatabaseAsync();
  const ran = await drainWebhookJobs(db);
  safeLog("info", "job drain completed", { operation: "jobs.drain", status: 200, count: ran });
  return json({ ran }, 200);
}
