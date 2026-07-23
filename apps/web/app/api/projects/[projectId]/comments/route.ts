import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/server/current-user";
import { CommentService } from "@/lib/server/collaboration/comment-service";
import { resolveBetaRoute } from "@/lib/server/route-auth";

const CreateCommentBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
  anchorKind: z.enum(["node", "edge", "diagram"]).optional(),
  anchorId: z.string().trim().min(1).max(160).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId } = await params;
  if (!projectId) return new NextResponse("Bad Request", { status: 400 });

  try {
    const comments = await new CommentService(ctx.db, ctx.user.id).listComments(projectId);
    return NextResponse.json({ comments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list comments.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId } = await params;
  if (!projectId) return new NextResponse("Bad Request", { status: 400 });

  const parsed = CreateCommentBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid comment request." }, { status: 400 });
  }

  try {
    const comment = await new CommentService(ctx.db, ctx.user.id).createComment({
      projectId,
      authorId: ctx.user.id,
      body: parsed.data.body,
      ...(parsed.data.anchorKind !== undefined && { anchorKind: parsed.data.anchorKind }),
      ...(parsed.data.anchorId !== undefined && { anchorId: parsed.data.anchorId }),
    });
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create comment.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
