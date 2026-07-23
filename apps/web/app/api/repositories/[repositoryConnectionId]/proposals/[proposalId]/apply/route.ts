import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { ProposalService } from "@/lib/server/repositories/proposal-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ repositoryConnectionId: string, proposalId: string }> }
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { proposalId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const { projectId } = body as { projectId: string };
  if (!projectId) return new NextResponse("Bad Request: missing projectId", { status: 400 });

  const proposalService = new ProposalService(ctx.db, ctx.user.id);

  try {
    await proposalService.applyProposal(proposalId, projectId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error";
    if (msg === "Proposal not found") {
      return new NextResponse("Not found", { status: 404 });
    }
    return new NextResponse(msg, { status: 400 });
  }
}
