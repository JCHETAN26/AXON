import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/server/current-user";
import { ShareLinkService } from "@/lib/server/collaboration/share-link-service";
import { resolveBetaRoute } from "@/lib/server/route-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; shareLinkId: string }> },
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId, shareLinkId } = await params;
  if (!projectId || !shareLinkId) return new NextResponse("Bad Request", { status: 400 });

  try {
    const revoked = await new ShareLinkService(ctx.db, ctx.user.id).revokeShareLink(
      projectId,
      shareLinkId,
    );
    return NextResponse.json({ revoked });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not revoke share link.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
