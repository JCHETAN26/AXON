import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { InfrastructurePrService } from "@/lib/server/github/infrastructure-pr-service";
import { getGithubGateway } from "@/lib/server/github/octokit-gateway";
import { type ArchitectureProposal } from "@axon/repo-intel";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ repositoryConnectionId: string }> }
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { repositoryConnectionId } = await params;
  if (!repositoryConnectionId) return new NextResponse("Bad Request", { status: 400 });

  const service = new InfrastructurePrService(ctx.db, ctx.user.id, getGithubGateway());
  const prs = await service.listControlledPrs(repositoryConnectionId);

  return NextResponse.json({ prs });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ repositoryConnectionId: string }> }
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { repositoryConnectionId } = await params;
  if (!repositoryConnectionId) return new NextResponse("Bad Request", { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { proposal, proposalId, targetBranch } = body as {
    proposal: ArchitectureProposal;
    proposalId: string;
    targetBranch?: string;
  };

  if (!proposal || !proposalId) {
    return new NextResponse("Bad Request: missing proposal or proposalId", { status: 400 });
  }

  const service = new InfrastructurePrService(ctx.db, ctx.user.id, getGithubGateway());

  try {
    const result = await service.submitControlledPr(
      repositoryConnectionId,
      proposal,
      proposalId,
      targetBranch ?? "main"
    );
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Infrastructure PR submission failed";
    return new NextResponse(msg, { status: 400 });
  }
}
