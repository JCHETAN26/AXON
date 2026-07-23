import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { ServerGithubRepository } from "@/lib/server/repositories/server-github-repository";
import { RepositoryInventoryService } from "@/lib/server/repositories/repository-inventory";
import { getGithubAppConfig } from "@/lib/server/github/config";
import { OctokitGithubGateway } from "@/lib/server/github/octokit-gateway";

const PostSchema = z.object({
  forceReanalyze: z.boolean().default(false),
});

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

  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) return new NextResponse("Bad Request", { status: 400 });

  const config = getGithubAppConfig();
  if (!config) return new NextResponse("GitHub App not configured", { status: 503 });

  const githubGateway = new OctokitGithubGateway(config);
  const repoStore = new ServerGithubRepository(ctx.db, ctx.user.id);
  const inventoryService = new RepositoryInventoryService(ctx.db, ctx.user.id, githubGateway, repoStore);

  try {
    const runId = await inventoryService.runAnalysis(
      repositoryConnectionId,
      ctx.user.id,
      parsed.data.forceReanalyze
    );
    return NextResponse.json({ runId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "Repository not found or access denied.") {
      return new NextResponse(msg, { status: 404 });
    }
    console.error("Repository analysis failed:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
