import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { getGithubGateway } from "@/lib/server/github/octokit-gateway";
import { PullRequestService } from "@/lib/server/github/pull-request-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ repositoryConnectionId: string }> }
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { repositoryConnectionId } = await params;
  if (!repositoryConnectionId) return new NextResponse("Bad Request", { status: 400 });

  const gateway = getGithubGateway();
  if (!gateway) {
    return NextResponse.json({ runs: [] });
  }

  const service = new PullRequestService(ctx.db, gateway, ctx.user.id);
  const runs = await service.listPullRequestRuns(repositoryConnectionId);

  return NextResponse.json({ runs });
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

  const { prNumber } = body as { prNumber: number };
  if (!prNumber || typeof prNumber !== "number") {
    return new NextResponse("Bad Request: missing prNumber", { status: 400 });
  }

  const gateway = getGithubGateway();
  if (!gateway) {
    return new NextResponse("Service Unavailable: GitHub App not configured", { status: 503 });
  }

  const service = new PullRequestService(ctx.db, gateway, ctx.user.id);

  try {
    const result = await service.analyzePullRequest(repositoryConnectionId, prNumber);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "PR Analysis failed";
    return new NextResponse(msg, { status: 400 });
  }
}
