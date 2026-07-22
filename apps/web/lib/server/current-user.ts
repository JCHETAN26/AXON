import { auth } from "./auth";
import { type AuthenticatedUser } from "./authz";

/**
 * Resolves the authenticated user from the validated server-side session.
 * Returns null when there is no valid session. This is the only source of
 * user identity for authorization — request-supplied ids are never trusted.
 */
export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (typeof id !== "string" || id.length === 0) {
    return null;
  }
  return {
    id,
    ...(typeof session?.user?.email === "string" && { email: session.user.email }),
  };
}
