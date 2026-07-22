import { GeneratedArchitectureDraftSchema, type GeneratedArchitectureDraft } from "./draft-schema";

export type ParseDraftResult =
  { ok: true; draft: GeneratedArchitectureDraft } | { ok: false; issues: string[] };

/** Pulls the first JSON object out of provider text (tolerates fences/prose). */
function extractJsonCandidate(text: string): string | null {
  const withoutFences = text.replace(/```(?:json)?/gi, "");
  const start = withoutFences.indexOf("{");
  const end = withoutFences.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return withoutFences.slice(start, end + 1);
}

export function parseDraft(text: string): ParseDraftResult {
  const candidate = extractJsonCandidate(text);
  if (candidate === null) {
    return { ok: false, issues: ["Response contained no JSON object"] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch (error) {
    return {
      ok: false,
      issues: [
        `Response was not valid JSON: ${error instanceof Error ? error.message : "parse error"}`,
      ],
    };
  }

  const result = GeneratedArchitectureDraftSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      issues: result.error.issues.map(
        (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      ),
    };
  }
  return { ok: true, draft: result.data };
}
