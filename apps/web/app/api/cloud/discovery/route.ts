import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { CloudDiscoveryService } from "@/lib/server/cloud/cloud-discovery-service";

export async function POST(request: Request) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { connectionId, declaredIacNames } = body as {
    connectionId: string;
    declaredIacNames?: string[];
  };

  if (!connectionId) {
    return new NextResponse("Bad Request: missing connectionId", { status: 400 });
  }

  const service = new CloudDiscoveryService(ctx.db, ctx.user.id);

  try {
    const result = await service.runDiscovery(connectionId, declaredIacNames ?? []);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Cloud discovery failed";
    return new NextResponse(msg, { status: 400 });
  }
}
