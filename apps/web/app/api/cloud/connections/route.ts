import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { CloudDiscoveryService } from "@/lib/server/cloud/cloud-discovery-service";
import { type CloudProvider } from "@axon/repo-intel";

export async function GET() {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const service = new CloudDiscoveryService(ctx.db, ctx.user.id);
  const connections = await service.listConnections();

  return NextResponse.json({ connections });
}

export async function POST(request: Request) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { provider, accountOrProjectId, roleArnOrServiceAccount } = body as {
    provider: CloudProvider;
    accountOrProjectId: string;
    roleArnOrServiceAccount: string;
  };

  if (!provider || !accountOrProjectId || !roleArnOrServiceAccount) {
    return new NextResponse("Bad Request: missing required cloud connection fields", { status: 400 });
  }

  const service = new CloudDiscoveryService(ctx.db, ctx.user.id);

  try {
    const connectionId = await service.registerConnection(
      provider,
      accountOrProjectId,
      roleArnOrServiceAccount
    );
    return NextResponse.json({ connectionId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    return new NextResponse(msg, { status: 400 });
  }
}
