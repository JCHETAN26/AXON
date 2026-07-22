import { authorizeBetaUser, type AuthenticatedUser } from "./authz";
import { getDatabaseAsync, type Database } from "./db/client";
import { ServerArtifactRepository } from "./repositories/server-artifact-repository";
import { ServerProjectRepository } from "./repositories/server-project-repository";

export interface BetaRouteContext {
  readonly db: Database;
  readonly user: AuthenticatedUser;
  readonly projects: ServerProjectRepository;
  readonly artifacts: ServerArtifactRepository;
}

/**
 * Resolves the owner-scoped repositories for an authenticated beta user, or a
 * safe error Response. Identity comes only from the validated server session —
 * never from the request. A 404 is used where revealing existence would leak
 * information; unauthenticated is 401 and missing beta access is 403.
 */
export async function resolveBetaRoute(
  getCurrentUser: () => Promise<AuthenticatedUser | null>,
  database?: Database,
): Promise<BetaRouteContext | Response> {
  const db = database ?? (await getDatabaseAsync());
  const user = await getCurrentUser();
  const access = await authorizeBetaUser(db, user);
  if (!access.ok) {
    const status = access.reason === "unauthenticated" ? 401 : 403;
    const error =
      access.reason === "unauthenticated"
        ? "Authentication required."
        : "A private-beta invitation is required.";
    return Response.json({ error }, { status });
  }
  return {
    db,
    user: access.user,
    projects: new ServerProjectRepository(db, access.user.id),
    artifacts: new ServerArtifactRepository(db, access.user.id),
  };
}
