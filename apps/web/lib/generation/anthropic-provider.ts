import Anthropic from "@anthropic-ai/sdk";
import {
  GenerationProviderError,
  type ArchitectureProvider,
  type ProviderPrompt,
} from "@axon/architecture-generation";

const DEFAULT_MODEL = "claude-opus-4-8";

/**
 * Server-only provider backed by the official Anthropic SDK. The system prompt
 * requires a single raw-JSON draft, and the generation package's zod pipeline
 * (parse → one repair round → normalize) is the validation authority. We do not
 * send `output_config` structured outputs here: that field is beta-only and the
 * stable Messages endpoint rejects it with a 400.
 */
export class AnthropicArchitectureProvider implements ArchitectureProvider {
  readonly id: string;
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(options: { apiKey: string; model?: string }) {
    this.client = new Anthropic({ apiKey: options.apiKey });
    this.model = options.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
    this.id = `anthropic:${this.model}`;
  }

  async complete(prompt: ProviderPrompt): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        system: prompt.system,
        messages: [{ role: "user", content: prompt.user }],
      });

      if (response.stop_reason === "refusal") {
        throw new GenerationProviderError("The model declined this request.");
      }

      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");
      if (text.length === 0) {
        throw new GenerationProviderError("The model returned no text content.");
      }
      return text;
    } catch (error) {
      if (error instanceof GenerationProviderError) {
        throw error;
      }
      if (error instanceof Anthropic.AuthenticationError) {
        throw new GenerationProviderError("The configured Anthropic API key was rejected.", {
          cause: error,
        });
      }
      if (error instanceof Anthropic.RateLimitError) {
        throw new GenerationProviderError(
          "The model provider is rate limiting requests — try again shortly.",
          { cause: error },
        );
      }
      if (error instanceof Anthropic.APIConnectionError) {
        throw new GenerationProviderError("Could not reach the model provider.", {
          cause: error,
        });
      }
      if (error instanceof Anthropic.APIError) {
        throw new GenerationProviderError(
          `Model provider error${error.status !== undefined ? ` (${String(error.status)})` : ""}.`,
          { cause: error },
        );
      }
      throw new GenerationProviderError("Unexpected model provider failure.", { cause: error });
    }
  }
}
