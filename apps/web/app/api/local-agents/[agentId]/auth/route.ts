import { NextResponse } from "next/server";

import { getDatabaseAsync } from "@/lib/server/db/client";
import { LocalAgentService } from "@/lib/server/local-agent/agent-service";

export async function POST(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  if (!agentId) return new NextResponse("Bad Request", { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { token } = body as { token?: string };
  if (!token) return new NextResponse("Bad Request: missing token", { status: 400 });

  const db = await getDatabaseAsync();
  const service = new LocalAgentService(db, "pairing-token");
  const result = await service.exchangePairingToken(agentId, token);
  if (!result) return new NextResponse("Unauthorized", { status: 401 });

  return NextResponse.json({
    agentId: result.agent.id,
    credential: result.credential,
    workspaceScope: result.agent.workspaceScope,
    allowedCapabilities: result.agent.allowedCapabilities,
    warning: "This credential will not be shown again. Store it securely and revoke it if exposed.",
  });
}
