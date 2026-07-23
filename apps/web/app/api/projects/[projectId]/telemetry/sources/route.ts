import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { TelemetryService } from "@/lib/server/telemetry/telemetry-service";
import { type TelemetryProvider } from "@axon/architecture-simulation";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId } = await params;
  if (!projectId) return new NextResponse("Bad Request", { status: 400 });

  const service = new TelemetryService(ctx.db, ctx.user.id);
  const sources = await service.listTelemetrySources(projectId);

  return NextResponse.json({ sources });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId } = await params;
  if (!projectId) return new NextResponse("Bad Request", { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { provider, name, endpointUrl } = body as {
    provider: TelemetryProvider;
    name: string;
    endpointUrl: string;
  };

  if (!provider || !name || !endpointUrl) {
    return new NextResponse("Bad Request: missing required telemetry source fields", { status: 400 });
  }

  const service = new TelemetryService(ctx.db, ctx.user.id);

  try {
    const sourceId = await service.registerTelemetrySource(
      projectId,
      provider,
      name,
      endpointUrl
    );
    return NextResponse.json({ sourceId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    return new NextResponse(msg, { status: 400 });
  }
}
