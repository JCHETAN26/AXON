import { safeParseArchitectureDocument } from "@axon/diagram-schema";
import { z } from "zod";

import { getCurrentUser } from "@/lib/server/current-user";
import { ConcurrencyError } from "@/lib/server/repositories/server-project-repository";
import {
  PAYLOAD_LIMITS,
  guardBodylessMutation,
  guardMutation,
  privateJson,
} from "@/lib/server/request-guard";
import { resolveBetaRoute } from "@/lib/server/route-auth";

interface Params {
  params: Promise<{ projectId: string }>;
}

const UpdateSchema = z.object({
  document: z.unknown(),
  expectedVersion: z.number().int().nonnegative().optional(),
  name: z.string().min(1).max(PAYLOAD_LIMITS.projectName).optional(),
});

export async function GET(_request: Request, { params }: Params): Promise<Response> {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;
  const { projectId } = await params;

  const project = await ctx.projects.getProject(projectId);
  // Not-found (never forbidden) when the project is absent or owned by someone
  // else, so existence is never leaked.
  if (project === null) {
    return privateJson({ error: "Project not found." }, { status: 404 });
  }
  const version = await ctx.projects.getDocumentVersion(projectId);
  return privateJson({ ...project, version });
}

export async function PUT(request: Request, { params }: Params): Promise<Response> {
  const guard = await guardMutation(request, {
    methods: ["PUT"],
    maxBytes: PAYLOAD_LIMITS.architectureDocumentBytes,
  });
  if ("response" in guard) return guard.response;

  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;
  const { projectId } = await params;

  const parsed = UpdateSchema.safeParse(guard.body);
  if (!parsed.success) {
    return privateJson({ error: "Invalid request body." }, { status: 400 });
  }
  const document = safeParseArchitectureDocument(parsed.data.document);
  if (!document.success) {
    return privateJson({ error: "Invalid architecture document." }, { status: 400 });
  }

  try {
    const saved = await ctx.projects.updateDocument(
      projectId,
      document.data,
      parsed.data.expectedVersion,
    );
    const version = await ctx.projects.getDocumentVersion(projectId);
    return privateJson({ ...saved, version });
  } catch (error) {
    if (error instanceof ConcurrencyError) {
      return privateJson({ error: error.message, code: "revision-conflict" }, { status: 409 });
    }
    // Ownership / identity failures read as not-found rather than leaking.
    return privateJson({ error: "Project not found." }, { status: 404 });
  }
}

export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  const guard = guardBodylessMutation(request, ["DELETE"]);
  if (guard !== null) return guard.response;

  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;
  const { projectId } = await params;
  // Owner-scoped delete; deleting a non-owned id simply affects nothing.
  await ctx.projects.deleteProject(projectId);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
