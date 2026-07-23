import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { getGithubGateway } from "@/lib/server/github/octokit-gateway";
import { PullRequestService } from "@/lib/server/github/pull-request-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ repositoryConnectionId: string; prNumber: string }> }
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { repositoryConnectionId, prNumber: rawPrNumber } = await params;
  const prNumber = parseInt(rawPrNumber, 10);

  if (!repositoryConnectionId || isNaN(prNumber)) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { runId } = body as { runId: string };
  if (!runId) {
    return new NextResponse("Bad Request: missing runId", { status: 400 });
  }

  const gateway = getGithubGateway();
  if (!gateway) {
    return new NextResponse("Service Unavailable: GitHub App not configured", { status: 503 });
  }

  const service = new PullRequestService(ctx.db, gateway, ctx.user.id);

  try {
    await service.postPrReviewComment(repositoryConnectionId, prNumber, runId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Posting PR comment failed";
    return new NextResponse(msg, { status: 400 });
  }
}
