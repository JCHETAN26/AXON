import { getGithubAppConfig, githubInstallUrl } from "@/lib/server/github/config";
import { createInstallState } from "@/lib/server/github/install-state";
import { getCurrentUser } from "@/lib/server/current-user";
import { resolveBetaRoute } from "@/lib/server/route-auth";

/**
 * Begins the GitHub App installation flow for an authenticated beta user. Mints
 * a signed, single-use state bound to the user, then redirects to GitHub where
 * the user selects repositories. GitHub returns to the callback route.
 */
export async function GET(request: Request): Promise<Response> {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const settings = new URL("/settings/connections", request.url);
  const config = getGithubAppConfig();
  if (config === null) {
    settings.searchParams.set("error", "not-configured");
    return Response.redirect(settings, 303);
  }

  const state = await createInstallState(ctx.db, ctx.user.id);
  const install = new URL(githubInstallUrl(config));
  install.searchParams.set("state", state);
  return Response.redirect(install, 303);
}
