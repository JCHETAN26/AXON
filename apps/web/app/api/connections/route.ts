import { z } from "zod";

import { getCurrentUser } from "@/lib/server/current-user";
import { ServerGithubRepository } from "@/lib/server/repositories/server-github-repository";
import { guardMutation, privateJson } from "@/lib/server/request-guard";
import { resolveBetaRoute } from "@/lib/server/route-auth";

const DisconnectSchema = z.object({ connectionId: z.string().uuid() });

/** Lists the authenticated user's connected installations and repositories. */
export async function GET(): Promise<Response> {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const store = new ServerGithubRepository(ctx.db, ctx.user.id);
  const [installations, repositories] = await Promise.all([
    store.listInstallations(),
    store.listRepositories(),
  ]);

  // Return only safe references — never tokens (none are stored) or internal ids
  // beyond the opaque connection ids the client needs to act.
  return privateJson({
    installations: installations.map((i) => ({
      id: i.id,
      accountLogin: i.accountLogin,
      accountType: i.accountType,
      status: i.status,
      connectedAt: i.connectedAt.toISOString(),
    })),
    repositories: repositories.map((r) => ({
      id: r.id,
      installationConnectionId: r.installationConnectionId,
      fullName: r.fullName,
      defaultBranch: r.defaultBranch,
      visibility: r.visibility,
      archived: r.archived,
      url: r.url,
      lastAnalyzedSha: r.lastAnalyzedSha,
      lastSyncStatus: r.lastSyncStatus,
    })),
  });
}

/** Disconnects an owned installation (cascades its repositories and analysis). */
export async function DELETE(request: Request): Promise<Response> {
  const guard = await guardMutation(request, { methods: ["DELETE"], maxBytes: 4_000 });
  if ("response" in guard) return guard.response;

  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const parsed = DisconnectSchema.safeParse(guard.body);
  if (!parsed.success) return privateJson({ error: "A connection id is required." }, { status: 400 });

  // Owner-scoped: disconnecting a non-owned id simply affects nothing.
  await new ServerGithubRepository(ctx.db, ctx.user.id).disconnectInstallation(
    parsed.data.connectionId,
  );
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
