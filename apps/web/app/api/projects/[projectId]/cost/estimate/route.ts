import { UsageDriverSchema } from "@axon/architecture-cost";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/server/current-user";
import { CostService } from "@/lib/server/cost/cost-service";
import { resolveBetaRoute } from "@/lib/server/route-auth";

const CostEstimateRequestSchema = z.object({
  provider: z.enum(["aws", "gcp", "azure"]).optional().default("aws"),
  region: z.string().min(1).optional().default("us-east-1"),
  usageDrivers: z.array(UsageDriverSchema),
  includeScaleProjections: z.boolean().optional().default(true),
  persistUsageAssumptions: z.boolean().optional().default(true),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId } = await params;
  if (!projectId) return new NextResponse("Bad Request", { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const parsed = CostEstimateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cost estimate request" }, { status: 400 });
  }

  const costService = new CostService(ctx.db, ctx.user.id);
  const estimate = await costService.createEstimateRun({
    projectId,
    provider: parsed.data.provider,
    region: parsed.data.region,
    usageDrivers: parsed.data.usageDrivers,
    persistUsageAssumptions: parsed.data.persistUsageAssumptions,
    includeScaleProjections: parsed.data.includeScaleProjections,
  });
  if (estimate === null) {
    return new NextResponse("Project not found", { status: 404 });
  }

  return NextResponse.json({
    runId: estimate.runId,
    baseline: estimate.baseline,
    scaleProjections: estimate.scaleProjections,
  });
}
