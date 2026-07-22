import { OfflineTemplateProvider, type ArchitectureProvider } from "@axon/architecture-generation";

import { AnthropicArchitectureProvider } from "./anthropic-provider";

export type GenerationMode = "live" | "offline";

export interface ServerGenerationProvider {
  provider: ArchitectureProvider;
  mode: GenerationMode;
}

/**
 * Live generation requires an explicit server-side API key. Without one —
 * or when AXON_GENERATION_MODE=offline (tests) — the deterministic offline
 * template provider runs, and the UI labels the result accordingly.
 */
export function getServerGenerationProvider(): ServerGenerationProvider {
  const forcedOffline = process.env.AXON_GENERATION_MODE === "offline";
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (forcedOffline || apiKey === undefined || apiKey.length === 0) {
    return { provider: new OfflineTemplateProvider(), mode: "offline" };
  }
  return { provider: new AnthropicArchitectureProvider({ apiKey }), mode: "live" };
}
