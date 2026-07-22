/** The provider failed to produce any output (network, auth, upstream error). */
export class GenerationProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GenerationProviderError";
  }
}

/** The provider's output never became a valid draft, even after one repair. */
export class DraftValidationError extends Error {
  readonly issues: readonly string[];
  readonly attempts: number;

  constructor(issues: readonly string[], attempts: number) {
    super(`Draft failed validation after ${attempts} attempt(s): ${issues.join("; ")}`);
    this.name = "DraftValidationError";
    this.issues = issues;
    this.attempts = attempts;
  }
}
