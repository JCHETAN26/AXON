// @vitest-environment node
// The Anthropic SDK refuses to construct in a browser-like (jsdom) env; this
// provider is server-only, so run its unit test under node.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AnthropicArchitectureProvider } from "./anthropic-provider";

// The constructor sets id = `anthropic:${model}`, so model resolution is
// observable without making an API call.
describe("AnthropicArchitectureProvider model resolution", () => {
  let original: string | undefined;
  beforeEach(() => {
    original = process.env.ANTHROPIC_MODEL;
  });
  afterEach(() => {
    if (original === undefined) delete process.env.ANTHROPIC_MODEL;
    else process.env.ANTHROPIC_MODEL = original;
  });

  it("falls back to the default model when ANTHROPIC_MODEL is an empty string", () => {
    // The real-world failure: `ANTHROPIC_MODEL=` in .env.local -> "" -> a 400
    // "model: String should have at least 1 character".
    process.env.ANTHROPIC_MODEL = "";
    const provider = new AnthropicArchitectureProvider({ apiKey: "sk-ant-test" });
    expect(provider.id).toBe("anthropic:claude-opus-4-8");
  });

  it("falls back to the default when ANTHROPIC_MODEL is only whitespace", () => {
    process.env.ANTHROPIC_MODEL = "   ";
    const provider = new AnthropicArchitectureProvider({ apiKey: "sk-ant-test" });
    expect(provider.id).toBe("anthropic:claude-opus-4-8");
  });

  it("uses ANTHROPIC_MODEL when it is set", () => {
    process.env.ANTHROPIC_MODEL = "claude-sonnet-5";
    const provider = new AnthropicArchitectureProvider({ apiKey: "sk-ant-test" });
    expect(provider.id).toBe("anthropic:claude-sonnet-5");
  });

  it("prefers an explicitly passed model over the environment", () => {
    process.env.ANTHROPIC_MODEL = "claude-sonnet-5";
    const provider = new AnthropicArchitectureProvider({
      apiKey: "sk-ant-test",
      model: "claude-haiku-4-5-20251001",
    });
    expect(provider.id).toBe("anthropic:claude-haiku-4-5-20251001");
  });
});
