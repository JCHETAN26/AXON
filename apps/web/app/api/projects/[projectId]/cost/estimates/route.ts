import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/server/current-user";
import { CostService } from "@/lib/server/cost/cost-service";
import { resolveBetaRoute } from "@/lib/server/route-auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId } = await params;
  if (!projectId) return new NextResponse("Bad Request", { status: 400 });

  const costService = new CostService(ctx.db, ctx.user.id);
  const estimates = await costService.listEstimateRuns(projectId);
  return NextResponse.json({ estimates });
}
