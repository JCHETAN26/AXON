import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { LocalAgentService } from "@/lib/server/local-agent/agent-service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { agentId } = await params;
  if (!agentId) return new NextResponse("Bad Request", { status: 400 });

  const service = new LocalAgentService(ctx.db, ctx.user.id);

  try {
    await service.revokeAgent(agentId);
    return NextResponse.json({ revoked: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to revoke agent";
    return new NextResponse(msg, { status: 400 });
  }
}
