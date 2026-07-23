import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { TelemetryService } from "@/lib/server/telemetry/telemetry-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId } = await params;
  if (!projectId) return new NextResponse("Bad Request", { status: 400 });

  const service = new TelemetryService(ctx.db, ctx.user.id);
  const calibration = await service.getCalibratedCapacityProfile(projectId);

  return NextResponse.json(calibration);
}

export async function POST(
  request: Request
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { sourceId, samples } = body as {
    sourceId: string;
    samples: { componentId: string; metricName: string; value: number; unit: string }[];
  };

  if (!sourceId || !Array.isArray(samples)) {
    return new NextResponse("Bad Request: missing sourceId or samples array", { status: 400 });
  }

  const service = new TelemetryService(ctx.db, ctx.user.id);

  try {
    await service.ingestMetricSamples(sourceId, samples);
    return NextResponse.json({ success: true, ingestedCount: samples.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Ingestion failed";
    return new NextResponse(msg, { status: 400 });
  }
}
