import { redirect } from "next/navigation";

import { authorizeBetaUser } from "./authz";
import { getCurrentUser } from "./current-user";
import { getDatabaseAsync } from "./db/client";
import { isCloudMode } from "./persistence-mode";

export interface GuardedUser {
  readonly id: string;
  readonly email?: string;
}

/**
 * Server-side guard for product pages. In cloud mode it requires an
 * authenticated session with beta access, redirecting to sign-in or the invite
 * page otherwise. In local mode there are no accounts, so it is a no-op.
 *
 * This is defence in depth alongside the edge middleware (which enforces
 * authentication) and the API routes (which enforce owner-scoping): the page
 * layer additionally enforces beta access, which the edge cannot check.
 */
export async function guardProductPage(returnTo: string): Promise<GuardedUser | null> {
  if (!isCloudMode()) return null;

  const user = await getCurrentUser();
  if (user === null) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(returnTo)}`);
  }

  const db = await getDatabaseAsync();
  const access = await authorizeBetaUser(db, user);
  if (!access.ok) {
    redirect(`/invite?callbackUrl=${encodeURIComponent(returnTo)}`);
  }

  return {
    id: access.user.id,
    ...(access.user.email !== undefined && { email: access.user.email }),
  };
}
