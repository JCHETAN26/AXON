import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/server/current-user";
import { ApprovalService } from "@/lib/server/collaboration/approval-service";
import { resolveBetaRoute } from "@/lib/server/route-auth";

const CreateApprovalBodySchema = z.object({
  subjectKind: z.enum(["architecture", "proposal", "comment", "share"]),
  subjectId: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1000).optional(),
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
    const approvals = await new ApprovalService(ctx.db, ctx.user.id).listApprovals(projectId);
    return NextResponse.json({ approvals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not list approvals.";
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

  const parsed = CreateApprovalBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid approval request." }, { status: 400 });
  }

  try {
    const approval = await new ApprovalService(ctx.db, ctx.user.id).createApproval({
      projectId,
      requesterId: ctx.user.id,
      subjectKind: parsed.data.subjectKind,
      subjectId: parsed.data.subjectId,
      title: parsed.data.title,
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
    });
    return NextResponse.json({ approval }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create approval.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
