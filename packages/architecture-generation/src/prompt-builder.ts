import { DRAFT_LIMITS } from "./draft-schema";
import { type ProviderPrompt } from "./provider";

const SYSTEM_PROMPT = `You are AXON's architecture generator. Given a plain-language description of a software system, respond with ONE JSON object describing a pragmatic production architecture — and nothing else. No markdown fences, no prose.

The JSON object must have exactly these fields:
- "name": short system name
- "summary": one-sentence description (optional)
- "assumptions": array of { "label", "value" } — explicit sizing/technology assumptions you made
- "groups": array of { "key", "label" } — architecture layers (e.g. public edge, application, data, external)
- "nodes": array of { "key", "name", "category", "groupKey" } — concrete services/components
- "edges": array of { "sourceKey", "targetKey", "kind" } where kind is "sync" | "async" | "data" | "telemetry"

Rules:
- Keys are short lowercase slugs (e.g. "api-gateway"). Every edge must reference existing node keys. Every groupKey must reference an existing group. No self-loops.
- Between ${DRAFT_LIMITS.minNodes} and ${DRAFT_LIMITS.maxNodes} nodes. Only meaningful connections.
- Do NOT include ids, UUIDs, timestamps, versions, coordinates, positions, or storage details — those belong to the application, not to you.`;

export function buildGenerationPrompt(userPrompt: string): ProviderPrompt {
  return {
    system: SYSTEM_PROMPT,
    user: `Design the architecture for the following system:\n\n${userPrompt}`,
  };
}

export function buildRepairPrompt(
  userPrompt: string,
  invalidOutput: string,
  issues: readonly string[],
): ProviderPrompt {
  return {
    system: SYSTEM_PROMPT,
    user: `Your previous response was not a valid architecture draft.

Original request:
${userPrompt}

Your previous response:
${invalidOutput}

Validation problems:
${issues.map((issue) => `- ${issue}`).join("\n")}

Respond again with ONE corrected JSON object only.`,
  };
}
