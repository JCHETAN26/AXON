import { createInvite } from "@/lib/server/beta";
import { getDatabaseAsync } from "@/lib/server/db/client";
import { isTestAuthEnabled } from "@/lib/server/auth-helpers";

/**
 * Dev/test-only helper to create a beta invitation, used by the authenticated
 * Playwright suite. Gated behind the same fail-closed test-auth flag, so it is
 * impossible to reach in production.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isTestAuthEnabled()) {
    return new Response(null, { status: 404 });
  }
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  const code = typeof body.code === "string" && body.code.length > 0 ? body.code : "BETA-TEST";
  const created = await createInvite(await getDatabaseAsync(), code);
  return Response.json({ code: created.code });
}
