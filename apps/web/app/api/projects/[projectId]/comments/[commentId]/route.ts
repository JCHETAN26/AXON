import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/server/current-user";
import { CommentService } from "@/lib/server/collaboration/comment-service";
import { resolveBetaRoute } from "@/lib/server/route-auth";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; commentId: string }> },
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId, commentId } = await params;
  if (!projectId || !commentId) return new NextResponse("Bad Request", { status: 400 });

  try {
    const resolved = await new CommentService(ctx.db, ctx.user.id).resolveComment(
      projectId,
      commentId,
    );
    return NextResponse.json({ resolved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not resolve comment.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
