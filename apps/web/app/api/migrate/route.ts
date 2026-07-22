import { safeParseArchitectureDocument } from "@axon/diagram-schema";
import { z } from "zod";

import { getCurrentUser } from "@/lib/server/current-user";
import { PAYLOAD_LIMITS, guardMutation, privateJson } from "@/lib/server/request-guard";
import { resolveBetaRoute } from "@/lib/server/route-auth";

/**
 * Local-to-cloud migration. Accepts browser-local projects and their
 * architecture documents and re-creates them under the authenticated user.
 * Server-owned identifiers are generated here — the client's local ids are
 * never trusted as storage keys. This runs only on explicit user consent
 * (the client gathers the payload and confirms before calling).
 *
 * Artifacts (audit/simulation/recommendation/import) are intentionally not
 * migrated; they are re-derived by re-running the relevant tool against the
 * migrated document, which keeps their embedded identifiers consistent.
 */
const MigrateSchema = z.object({
  projects: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        description: z.string().max(2000).optional(),
        document: z.unknown(),
      }),
    )
    .max(PAYLOAD_LIMITS.migrationBatch),
});

export async function POST(request: Request): Promise<Response> {
  const guard = await guardMutation(request, {
    methods: ["POST"],
    maxBytes: PAYLOAD_LIMITS.migrationBatch * PAYLOAD_LIMITS.architectureDocumentBytes,
  });
  if ("response" in guard) return guard.response;

  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const parsed = MigrateSchema.safeParse(guard.body);
  if (!parsed.success) {
    return privateJson({ error: "Invalid migration payload." }, { status: 400 });
  }

  const migrated: { localName: string; projectId: string }[] = [];
  const skipped: { localName: string; reason: string }[] = [];

  for (const entry of parsed.data.projects) {
    const document = safeParseArchitectureDocument(entry.document);
    if (!document.success) {
      skipped.push({ localName: entry.name, reason: "invalid-document" });
      continue;
    }
    // A fresh server-owned project; its generated id becomes the document id.
    const created = await ctx.projects.createProject({
      name: entry.name,
      ...(entry.description !== undefined && { description: entry.description }),
      template: "blank",
    });
    const restamped = {
      ...document.data,
      id: created.project.id,
      projectId: created.project.id,
      updatedAt: new Date().toISOString(),
    };
    await ctx.projects.updateDocument(created.project.id, restamped);
    migrated.push({ localName: entry.name, projectId: created.project.id });
  }

  return privateJson({ migrated, skipped });
}
