import { getCurrentUser } from "@/lib/server/current-user";
import { GithubError } from "@/lib/server/github/gateway";
import { consumeInstallState } from "@/lib/server/github/install-state";
import { getGithubGateway } from "@/lib/server/github/octokit-gateway";
import {
  InstallationClaimError,
  ServerGithubRepository,
} from "@/lib/server/repositories/server-github-repository";
import { resolveBetaRoute } from "@/lib/server/route-auth";

/**
 * GitHub App installation callback. GitHub redirects the browser here after the
 * user selects repositories, with `installation_id` and our signed `state`.
 * The flow is bound to the user who started it: the state must be valid, unused,
 * unexpired, and match the current session. The installation is verified through
 * GitHub before it is linked; no installation token is ever stored.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const settings = new URL("/settings/connections", request.url);
  const fail = (code: string): Response => {
    settings.searchParams.set("error", code);
    return Response.redirect(settings, 303);
  };

  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) {
    // Browser callback without a session/beta access → route through sign-in.
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("callbackUrl", "/settings/connections");
    return Response.redirect(signIn, 303);
  }

  const claimed = await consumeInstallState(ctx.db, url.searchParams.get("state"));
  if (claimed === null) return fail("invalid-state");
  // The flow must be completed by the same account that started it.
  if (claimed.userId !== ctx.user.id) return fail("state-mismatch");

  const installationId = Number(url.searchParams.get("installation_id"));
  if (!Number.isInteger(installationId) || installationId <= 0) {
    return fail("invalid-installation");
  }

  const gateway = getGithubGateway();
  if (gateway === null) return fail("not-configured");

  try {
    const info = await gateway.verifyInstallation(installationId);
    if (info === null) return fail("installation-unavailable");

    await new ServerGithubRepository(ctx.db, ctx.user.id).linkInstallation(info);
    settings.searchParams.set("connected", "1");
    return Response.redirect(settings, 303);
  } catch (error) {
    if (error instanceof InstallationClaimError) return fail("already-connected");
    if (error instanceof GithubError) return fail("github-unavailable");
    return fail("unexpected");
  }
}
