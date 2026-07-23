import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { EvidenceSyncService } from "@/lib/server/local-agent/sync-service";
import { type RepositoryEvidence, type ArchitectureProposal } from "@axon/repo-intel";

export async function POST(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { agentId } = await params;
  if (!agentId) return new NextResponse("Bad Request", { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { evidence, proposal, projectId, excludedEvidenceIds } = body as {
    evidence?: RepositoryEvidence[];
    proposal?: ArchitectureProposal;
    projectId?: string;
    excludedEvidenceIds?: string[];
  };

  if (!evidence || !proposal) {
    return new NextResponse("Bad Request: missing evidence or proposal", { status: 400 });
  }

  const service = new EvidenceSyncService(ctx.db, ctx.user.id);

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
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Evidence sync failed";
    return new NextResponse(msg, { status: 400 });
  }
}
