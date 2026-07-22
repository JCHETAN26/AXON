import { type GeneratedArchitectureDraft } from "./draft-schema";
import { DraftValidationError, GenerationProviderError } from "./errors";
import { normalizeDraft } from "./normalize-draft";
import { parseDraft } from "./parse-draft";
import { buildGenerationPrompt, buildRepairPrompt } from "./prompt-builder";
import { type ArchitectureProvider } from "./provider";

export interface GenerationOutcome {
  draft: GeneratedArchitectureDraft;
  providerId: string;
  /** 1 = first response was valid; 2 = one repair round was needed. */
  attempts: 1 | 2;
}

async function completeOrThrow(
  provider: ArchitectureProvider,
  prompt: { system: string; user: string },
): Promise<string> {
  try {
    return await provider.complete(prompt);
  } catch (error) {
    if (error instanceof GenerationProviderError) {
      throw error;
    }
    throw new GenerationProviderError(
      `Provider ${provider.id} failed: ${error instanceof Error ? error.message : "unknown error"}`,
      { cause: error },
    );
  }
}

/**
 * Prompt → provider → parse → (at most one repair) → normalized draft.
 * Throws DraftValidationError when the repaired output is still invalid.
 */
export async function generateArchitectureDraft(
  provider: ArchitectureProvider,
  userPrompt: string,
): Promise<GenerationOutcome> {
  const firstResponse = await completeOrThrow(provider, buildGenerationPrompt(userPrompt));
  const firstParse = parseDraft(firstResponse);
  if (firstParse.ok) {
    return { draft: normalizeDraft(firstParse.draft), providerId: provider.id, attempts: 1 };
  }

  const repairResponse = await completeOrThrow(
    provider,
    buildRepairPrompt(userPrompt, firstResponse, firstParse.issues),
  );
  const repairParse = parseDraft(repairResponse);
  if (repairParse.ok) {
    return { draft: normalizeDraft(repairParse.draft), providerId: provider.id, attempts: 2 };
  }

  throw new DraftValidationError(repairParse.issues, 2);
}
