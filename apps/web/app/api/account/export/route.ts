import { getCurrentUser } from "@/lib/server/current-user";
import { collectAccountExport } from "@/lib/server/export/collect-export";
import { exportFilename } from "@/lib/server/export/filename";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { PRODUCT_VERSION } from "@/lib/server/version";

/**
 * Exports all of the authenticated user's AXON product data as a versioned JSON
 * bundle. Owner-scoped by the session identity; contains only this user's data
 * and never OAuth tokens, sessions, invite hashes, provider credentials, raw
 * Compose YAML, feedback bodies, or another user's data.
 */
export async function GET(): Promise<Response> {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const now = new Date();
  const result = await collectAccountExport(ctx.db, ctx.user.id, now, PRODUCT_VERSION);
  if (!result.ok) {
    return Response.json(
      {
        error: `This account has ${String(result.count)} projects, above the synchronous export limit of ${String(result.limit)}. Export projects individually.`,
      },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  const filename = exportFilename("account", ctx.user.email ?? "data", now);
  return new Response(JSON.stringify(result.bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
