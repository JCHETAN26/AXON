import { UsageDriverSchema } from "@axon/architecture-cost";
import { NextResponse } from "next/server";
import { z } from "zod";

import { CostService } from "@/lib/server/cost/cost-service";
import { getCurrentUser } from "@/lib/server/current-user";
import { resolveBetaRoute } from "@/lib/server/route-auth";

const CostAssumptionsRequestSchema = z.object({
  usageDrivers: z.array(UsageDriverSchema),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId } = await params;
  if (!projectId) return new NextResponse("Bad Request", { status: 400 });

  const costService = new CostService(ctx.db, ctx.user.id);
  const usageDrivers = await costService.listUsageAssumptions(projectId);
  return NextResponse.json({ usageDrivers });
}

export async function PUT(
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

  const parsed = CostAssumptionsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cost assumptions request" }, { status: 400 });
  }

  const costService = new CostService(ctx.db, ctx.user.id);
  try {
    await costService.upsertUsageAssumptions(projectId, parsed.data.usageDrivers);
  } catch {
    return new NextResponse("Project not found", { status: 404 });
  }
  return NextResponse.json({ usageDrivers: parsed.data.usageDrivers });
}
