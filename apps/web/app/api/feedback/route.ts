import { z } from "zod";

import { authorizeBetaUser } from "@/lib/server/authz";
import { getCurrentUser } from "@/lib/server/current-user";
import { getDatabaseAsync } from "@/lib/server/db/client";
import { feedback } from "@/lib/server/db/schema";
import { PAYLOAD_LIMITS, guardMutation, privateJson } from "@/lib/server/request-guard";

const FeedbackSchema = z.object({
  category: z.enum(["bug", "idea", "confusing", "praise", "other"]),
  message: z.string().min(1).max(PAYLOAD_LIMITS.feedbackMessage),
  // Feedback is never associated with a project id — architecture content and
  // project linkage are deliberately excluded from feedback.
});

/**
 * Records product feedback for the authenticated beta user. Owner-scoped by
 * the session identity; the request never supplies a user id, and feedback
 * never carries architecture content, project ids, or Compose source.
 */
export async function POST(request: Request): Promise<Response> {
  const guard = await guardMutation(request, {
    methods: ["POST"],
    maxBytes: PAYLOAD_LIMITS.feedbackMessage + 1_000,
  });
  if ("response" in guard) return guard.response;

  const db = await getDatabaseAsync();
  const access = await authorizeBetaUser(db, await getCurrentUser());
  if (!access.ok) {
    const status = access.reason === "unauthenticated" ? 401 : 403;
    return privateJson({ error: "Not permitted." }, { status });
  }

  const parsed = FeedbackSchema.safeParse(guard.body);
  if (!parsed.success) {
    return privateJson({ error: "Please choose a category and write a message." }, { status: 400 });
  }

  await db.insert(feedback).values({
    userId: access.user.id,
    category: parsed.data.category,
    message: parsed.data.message,
  });
  return privateJson({ ok: true }, { status: 201 });
}
