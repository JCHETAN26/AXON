import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/server/current-user";
import { ApprovalService } from "@/lib/server/collaboration/approval-service";
import { resolveBetaRoute } from "@/lib/server/route-auth";

const DecideApprovalBodySchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; approvalId: string }> },
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId, approvalId } = await params;
  if (!projectId || !approvalId) return new NextResponse("Bad Request", { status: 400 });

  const parsed = DecideApprovalBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid approval decision." }, { status: 400 });
  }

  try {
    const approval = await new ApprovalService(ctx.db, ctx.user.id).decideApproval(
      projectId,
      approvalId,
      parsed.data.decision,
      ctx.user.id,
    );
    if (approval === null) {
      return NextResponse.json({ error: "Approval is not pending." }, { status: 409 });
    }
    return NextResponse.json({ approval });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not decide approval.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
