import { z } from "zod";

import { hasBetaAccess, redeemInvite } from "@/lib/server/beta";
import { getCurrentUser } from "@/lib/server/current-user";
import { getDatabaseAsync } from "@/lib/server/db/client";
import { guardMutation, privateJson } from "@/lib/server/request-guard";

const RedeemSchema = z.object({ code: z.string().min(1).max(200) });

/**
 * Redeems a private-beta invitation for the authenticated user. Identity comes
 * only from the validated session — the request never supplies a user id.
 * Signing in does not grant access; redemption here does.
 */
export async function POST(request: Request): Promise<Response> {
  const guard = await guardMutation(request, { methods: ["POST"], maxBytes: 4_000 });
  if ("response" in guard) return guard.response;

  const user = await getCurrentUser();
  if (user === null) {
    return privateJson({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = RedeemSchema.safeParse(guard.body);
  if (!parsed.success) {
    return privateJson({ error: "An invitation code is required." }, { status: 400 });
  }

  const db = await getDatabaseAsync();
  const result = await redeemInvite(db, user.id, parsed.data.code);
  if (result.ok || (await hasBetaAccess(db, user.id))) {
    return privateJson({ ok: true });
  }

  const message =
    result.reason === "invalid-code"
      ? "That invitation code is not valid."
      : result.reason === "already-redeemed"
        ? "That invitation has already been used."
        : "Invitation could not be redeemed.";
  return privateJson({ error: message }, { status: 400 });
}
