import { getCurrentUser } from "@/lib/server/current-user";
import { collectProjectExport } from "@/lib/server/export/collect-export";
import { exportFilename } from "@/lib/server/export/filename";
import { PRODUCT_VERSION } from "@/lib/server/version";
import { resolveBetaRoute } from "@/lib/server/route-auth";

interface Params {
  params: Promise<{ projectId: string }>;
}

/**
 * Exports one owner's project as a validated, versioned AXON JSON bundle.
 * Owner-scoped: another user's (or a missing) project is a safe 404. The bundle
 * is an AXON model export, never an infrastructure backup, and excludes raw
 * Compose YAML, secrets, tokens, and internal metadata.
 */
export async function GET(_request: Request, { params }: Params): Promise<Response> {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;
  const { projectId } = await params;

  const now = new Date();
  const bundle = await collectProjectExport(ctx.db, ctx.user.id, projectId, now, PRODUCT_VERSION);
  if (bundle === null) {
    return Response.json(
      { error: "Project not found." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const filename = exportFilename("project", bundle.project.name, now);
  return new Response(JSON.stringify(bundle, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
