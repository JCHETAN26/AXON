import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { getDatabaseAsync } from "@/lib/server/db/client";
import { LocalAgentService } from "@/lib/server/local-agent/agent-service";
import { EvidenceSyncService } from "@/lib/server/local-agent/sync-service";
import { type RepositoryEvidence, type ArchitectureProposal } from "@axon/repo-intel";

export async function POST(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  if (!agentId) return new NextResponse("Bad Request", { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const {
    evidence,
    proposal,
    projectId,
    excludedEvidenceIds,
    localAnalysisVersion,
    localWorkspaceSnapshotId,
  } = body as {
    evidence?: RepositoryEvidence[];
    proposal?: ArchitectureProposal;
    projectId?: string;
    excludedEvidenceIds?: string[];
    localAnalysisVersion?: string;
    localWorkspaceSnapshotId?: string;
  };

  if (!evidence || !proposal) {
    return new NextResponse("Bad Request: missing evidence or proposal", { status: 400 });
  }

  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const db = await getDatabaseAsync();
  let ownerId: string;

  if (bearer) {
    const agent = await new LocalAgentService(db, "agent-auth").authenticateCredential(
      agentId,
      bearer,
    );
    if (!agent) return new NextResponse("Unauthorized", { status: 401 });
    ownerId = agent.ownerId;
  } else {
    const ctx = await resolveBetaRoute(getCurrentUser, db);
    if (ctx instanceof Response) return ctx;
    ownerId = ctx.user.id;
  }

  const service = new EvidenceSyncService(db, ownerId);

  try {
    const syncRequest = {
      agentConnectionId: agentId,
      evidence,
      proposal,
    };
    const result = await service.submitSync({
      ...syncRequest,
      ...(projectId === undefined ? {} : { projectId }),
      ...(excludedEvidenceIds === undefined ? {} : { excludedEvidenceIds }),
      ...(localAnalysisVersion === undefined ? {} : { localAnalysisVersion }),
      ...(localWorkspaceSnapshotId === undefined ? {} : { localWorkspaceSnapshotId }),
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Evidence sync failed";
    return new NextResponse(msg, { status: 400 });
  }
}
