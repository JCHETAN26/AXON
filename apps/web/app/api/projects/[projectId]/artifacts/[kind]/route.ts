import { getCurrentUser } from "@/lib/server/current-user";
import { ARTIFACT_KINDS, type ArtifactKind } from "@/lib/server/db/schema";
import {
  PAYLOAD_LIMITS,
  guardBodylessMutation,
  guardMutation,
  privateJson,
} from "@/lib/server/request-guard";
import { resolveBetaRoute } from "@/lib/server/route-auth";

interface Params {
  params: Promise<{ projectId: string; kind: string }>;
}

function toKind(raw: string): ArtifactKind | null {
  return (ARTIFACT_KINDS as readonly string[]).includes(raw) ? (raw as ArtifactKind) : null;
}

// Per-kind byte caps for persisted artifact payloads.
const ARTIFACT_LIMIT: Record<ArtifactKind, number> = {
  audit: PAYLOAD_LIMITS.auditBytes,
  copilot: PAYLOAD_LIMITS.copilotBytes,
  recommendation: PAYLOAD_LIMITS.recommendationBytes,
  simulation: PAYLOAD_LIMITS.simulationBytes,
  import: PAYLOAD_LIMITS.importDraftBytes,
};

export async function GET(_request: Request, { params }: Params): Promise<Response> {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;
  const { projectId, kind } = await params;
  const artifactKind = toKind(kind);
  if (artifactKind === null) return privateJson({ error: "Unknown artifact." }, { status: 404 });

  // Returns null (as {payload:null}) when absent or not owned — never leaks.
  const payload = await ctx.artifacts.get(projectId, artifactKind);
  return privateJson({ payload });
}

export async function PUT(request: Request, { params }: Params): Promise<Response> {
  const { projectId, kind } = await params;
  const artifactKind = toKind(kind);
  if (artifactKind === null) return privateJson({ error: "Unknown artifact." }, { status: 404 });

  const guard = await guardMutation(request, {
    methods: ["PUT"],
    maxBytes: ARTIFACT_LIMIT[artifactKind],
  });
  if ("response" in guard) return guard.response;

  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const payload = (guard.body as { payload?: unknown }).payload;

  try {
    await ctx.artifacts.save(projectId, artifactKind, payload);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    // Writing into a non-owned project reads as not-found.
    return privateJson({ error: "Project not found." }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  const guard = guardBodylessMutation(request, ["DELETE"]);
  if (guard !== null) return guard.response;

  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;
  const { projectId, kind } = await params;
  const artifactKind = toKind(kind);
  if (artifactKind === null) return privateJson({ error: "Unknown artifact." }, { status: 404 });
  await ctx.artifacts.delete(projectId, artifactKind);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
