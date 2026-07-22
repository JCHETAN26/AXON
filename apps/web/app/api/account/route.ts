import { z } from "zod";

import { authorizeBetaUser } from "@/lib/server/authz";
import { ACCOUNT_DELETE_CONFIRMATION, deleteAccount } from "@/lib/server/account-deletion";
import { getCurrentUser } from "@/lib/server/current-user";
import { getDatabaseAsync } from "@/lib/server/db/client";
import { guardMutation, privateJson } from "@/lib/server/request-guard";
import { clearSessionCookies } from "@/lib/server/session-cookies";

const DeleteSchema = z.object({ confirm: z.string() });

/**
 * Deletes the authenticated user's account and all owner-scoped data.
 *
 * Identity comes only from the validated session — never a client-supplied
 * user id. Requires the exact confirmation phrase. The deletion runs in a
 * transaction; a failed transaction returns an error and leaves the account
 * intact (never a false success). On success the session cookies are cleared,
 * so the browser loses authenticated access immediately.
 */
export async function POST(request: Request): Promise<Response> {
  const guard = await guardMutation(request, { methods: ["POST"], maxBytes: 4_000 });
  if ("response" in guard) return guard.response;

  const db = await getDatabaseAsync();
  const access = await authorizeBetaUser(db, await getCurrentUser());
  if (!access.ok) {
    const status = access.reason === "unauthenticated" ? 401 : 403;
    return privateJson({ error: "Not permitted." }, { status });
  }

  const parsed = DeleteSchema.safeParse(guard.body);
  if (!parsed.success || parsed.data.confirm !== ACCOUNT_DELETE_CONFIRMATION) {
    return privateJson(
      { error: `Type "${ACCOUNT_DELETE_CONFIRMATION}" exactly to confirm.` },
      { status: 400 },
    );
  }

  const result = await deleteAccount(db, access.user.id);
  if (!result.ok) {
    // Failed transaction: the account and its projects remain intact.
    return privateJson(
      { error: "Account deletion failed. Your account and projects are unchanged." },
      { status: 500 },
    );
  }

  const response = privateJson({ ok: true });
  clearSessionCookies(response);
  return response;
}
