export interface ProviderPrompt {
  system: string;
  user: string;
}

/**
 * Minimal provider contract: given prompts, return raw text expected to
 * contain a JSON draft. Providers know nothing about persistence, ids, or
 * documents — the pipeline validates and converts their output.
 */
export interface ArchitectureProvider {
  readonly id: string;
  complete(prompt: ProviderPrompt): Promise<string>;
}
