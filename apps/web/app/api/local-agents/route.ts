import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { LocalAgentService } from "@/lib/server/local-agent/agent-service";

export async function GET() {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const service = new LocalAgentService(ctx.db, ctx.user.id);
  const agents = await service.listAgents();

  return NextResponse.json({ agents });
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

  const { agentName, machineLabel, workspaceScope, allowedCapabilities } = body as {
    agentName?: string;
    machineLabel?: string;
    workspaceScope?: string;
    allowedCapabilities?: string[];
  };

  if (!agentName || !machineLabel || !workspaceScope) {
    return new NextResponse("Bad Request: missing agentName, machineLabel, or workspaceScope", {
      status: 400,
    });
  }

  const service = new LocalAgentService(ctx.db, ctx.user.id);

  try {
    const createParams = {
      agentName,
      machineLabel,
      workspaceScope,
    };
    const paramsWithCapabilities =
      allowedCapabilities === undefined ? createParams : { ...createParams, allowedCapabilities };

    const result = await service.createAgent({
      ...paramsWithCapabilities,
    });

    // Token is shown exactly once in this response
    return NextResponse.json({
      agentId: result.agentId,
      token: result.token,
      warning: "This token will not be shown again. Store it securely.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create agent";
    return new NextResponse(msg, { status: 400 });
  }
}
