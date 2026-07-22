import {
  DraftValidationError,
  GenerationProviderError,
  generateArchitectureDraft,
} from "@axon/architecture-generation";
import { z } from "zod";

import { getServerGenerationProvider } from "@/lib/generation/get-server-provider";
import { authorizeBetaUser } from "@/lib/server/authz";
import { PAYLOAD_LIMITS, guardMutation, privateJson } from "@/lib/server/request-guard";
import { isCloudMode } from "@/lib/server/cloud-mode";

const GenerateRequestSchema = z.object({
  prompt: z.string().min(10, "Describe the system in at least a sentence.").max(2000),
});

/**
 * In cloud mode, generation requires an authenticated beta user and is
 * metered per user. The endpoint is never unrestricted in the deployed
 * product. In local mode (no database) these gates are inert so local-first
 * development keeps working. Returns quota headers/status on success.
 */
async function enforceCloudAccess(): Promise<
  | { ok: true; quota?: { used: number; limit: number; remaining: number } }
  | { ok: false; response: Response }
> {
  if (!isCloudMode()) return { ok: true };

  // Imported lazily so local mode never loads the auth/db stack.
  const [{ getCurrentUser }, { getDatabaseAsync }, quota] = await Promise.all([
    import("@/lib/server/current-user"),
    import("@/lib/server/db/client"),
    import("@/lib/server/generation-quota"),
  ]);

  const db = await getDatabaseAsync();
  const user = await getCurrentUser();
  const access = await authorizeBetaUser(db, user);
  if (!access.ok) {
    const status = access.reason === "unauthenticated" ? 401 : 403;
    return {
      ok: false,
      response: Response.json(
        {
          error:
            access.reason === "unauthenticated"
              ? "Sign in to generate an architecture."
              : "A private-beta invitation is required to generate.",
        },
        { status },
      ),
    };
  }

  const outcome = await quota.consumeGeneration(db, access.user.id);
  if (!outcome.allowed) {
    return {
      ok: false,
      response: Response.json(
        {
          error:
            outcome.reason === "quota-exceeded"
              ? "You have reached today's generation limit."
              : "You are generating too quickly. Please wait a moment.",
          quota: outcome.status,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil((outcome.retryAfterMs ?? 1000) / 1000)),
            "X-RateLimit-Limit": String(outcome.status.limit),
            "X-RateLimit-Remaining": String(outcome.status.remaining),
          },
        },
      ),
    };
  }

  return { ok: true, quota: outcome.status };
}

export async function POST(request: Request): Promise<Response> {
  const guard = await guardMutation(request, {
    methods: ["POST"],
    maxBytes: PAYLOAD_LIMITS.generationPrompt + 2_000,
  });
  if ("response" in guard) return guard.response;

  const access = await enforceCloudAccess();
  if (!access.ok) return access.response;

  const parsed = GenerateRequestSchema.safeParse(guard.body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 },
    );
  }

  const { provider, mode } = getServerGenerationProvider();
  try {
    const outcome = await generateArchitectureDraft(provider, parsed.data.prompt);
    return privateJson({
      draft: outcome.draft,
      providerId: outcome.providerId,
      attempts: outcome.attempts,
      mode,
      ...(access.quota !== undefined && { quota: access.quota }),
    });
  } catch (error) {
    if (error instanceof DraftValidationError) {
      return Response.json(
        {
          error: "The model could not produce a valid architecture draft. Try rephrasing.",
          issues: error.issues,
        },
        { status: 422 },
      );
    }
    if (error instanceof GenerationProviderError) {
      return Response.json({ error: error.message }, { status: 502 });
    }
    return Response.json({ error: "Unexpected generation failure." }, { status: 500 });
  }
}
