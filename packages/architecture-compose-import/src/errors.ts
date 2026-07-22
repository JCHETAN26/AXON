/** A fatal problem that prevents parsing — distinct from a reviewable warning. */
export type ImportErrorCode =
  | "too-large"
  | "empty"
  | "invalid-yaml"
  | "unsafe-yaml"
  | "too-deep"
  | "scalar-too-long"
  | "not-an-object"
  | "no-services"
  | "limit-exceeded"
  | "invalid-shape";

export class ComposeImportError extends Error {
  readonly code: ImportErrorCode;

  constructor(code: ImportErrorCode, message: string) {
    super(message);
    this.name = "ComposeImportError";
    this.code = code;
  }
}
