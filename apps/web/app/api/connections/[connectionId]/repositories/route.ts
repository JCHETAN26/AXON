import { z } from "zod";

import { getCurrentUser } from "@/lib/server/current-user";
import { GithubError } from "@/lib/server/github/gateway";
import { getGithubGateway } from "@/lib/server/github/octokit-gateway";
import { ServerGithubRepository } from "@/lib/server/repositories/server-github-repository";
import { guardMutation, privateJson } from "@/lib/server/request-guard";
import { resolveBetaRoute } from "@/lib/server/route-auth";

interface Params {
  params: Promise<{ connectionId: string }>;
}

const ConnectSchema = z.object({ repoGithubId: z.number().int().positive() });

/** Lists repositories actually granted to an owned installation. */
export async function GET(_request: Request, { params }: Params): Promise<Response> {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;
  const { connectionId } = await params;

  const store = new ServerGithubRepository(ctx.db, ctx.user.id);
  const installation = await store.getInstallation(connectionId);
  if (installation === null) return privateJson({ error: "Not found." }, { status: 404 });

  const gateway = getGithubGateway();
  if (gateway === null) return privateJson({ error: "GitHub is not configured." }, { status: 503 });

  try {
    const granted = await gateway.listInstallationRepositories(installation.installationId);
    const connected = new Set((await store.listRepositories(connectionId)).map((r) => r.repoGithubId));
    return privateJson({
      repositories: granted.map((r) => ({
        repoGithubId: r.repoGithubId,
        fullName: r.fullName,
        defaultBranch: r.defaultBranch,
        visibility: r.visibility,
        archived: r.archived,
        url: r.url,
        connected: connected.has(r.repoGithubId),
      })),
    });
  } catch (error) {
    if (error instanceof GithubError) {
      return privateJson({ error: "GitHub is unavailable.", code: error.code }, { status: 502 });
    }
    return privateJson({ error: "Could not list repositories." }, { status: 502 });
  }
}

/** Connects one repository that the installation actually granted. */
export async function POST(request: Request, { params }: Params): Promise<Response> {
  const guard = await guardMutation(request, { methods: ["POST"], maxBytes: 4_000 });
  if ("response" in guard) return guard.response;

  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;
  const { connectionId } = await params;

  const parsed = ConnectSchema.safeParse(guard.body);
  if (!parsed.success) return privateJson({ error: "A repository id is required." }, { status: 400 });

  const store = new ServerGithubRepository(ctx.db, ctx.user.id);
  const installation = await store.getInstallation(connectionId);
  if (installation === null) return privateJson({ error: "Not found." }, { status: 404 });

  const gateway = getGithubGateway();
  if (gateway === null) return privateJson({ error: "GitHub is not configured." }, { status: 503 });

  try {
    // Only a repository actually granted to this installation may be connected —
    // never a client-supplied name or an ungranted id.
    const granted = await gateway.listInstallationRepositories(installation.installationId);
    const match = granted.find((r) => r.repoGithubId === parsed.data.repoGithubId);
    if (match === undefined) return privateJson({ error: "Not found." }, { status: 404 });

    const connected = await store.connectRepository(connectionId, match);
    if (connected === null) return privateJson({ error: "Not found." }, { status: 404 });
    return privateJson({ id: connected.id, fullName: connected.fullName });
  } catch (error) {
    if (error instanceof GithubError) {
      return privateJson({ error: "GitHub is unavailable.", code: error.code }, { status: 502 });
    }
    return privateJson({ error: "Could not connect the repository." }, { status: 502 });
  }
}
