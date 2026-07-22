import { convertToCandidate } from "./convert";
import { normalizeCompose } from "./normalize";
import { parseComposeYaml } from "./parse-yaml";
import { type ComposeImportResult } from "./types";
import { WarningCollector } from "./warnings";

/**
 * Bumped whenever parsing, classification, or conversion changes behaviour.
 * Together with the Compose text and options it pins the result: the same
 * three inputs always produce the same model, candidate, warnings, and
 * confidence classifications.
 */
export const IMPORTER_VERSION = "1.0.0";

export const IMPORT_DISCLAIMER =
  "Imported from configuration—not verified against a running environment.";

export interface ImportOptions {
  /** Reviewer category overrides, keyed by Compose service name. */
  readonly categoryOverrides?: Readonly<Record<string, string>>;
}

/**
 * Deterministic, non-executing Compose import. Parses the supplied text,
 * normalizes the supported subset, classifies services, infers dependency
 * edges, and reports every unsupported feature as a structured warning.
 *
 * Never starts containers, pulls images, runs Docker or shell commands,
 * reads host paths or referenced files, resolves URLs, or loads environment
 * secrets. Throws {@link ComposeImportError} on input it cannot safely model.
 */
export function importCompose(text: string, options: ImportOptions = {}): ComposeImportResult {
  const warnings = new WarningCollector();
  const root = parseComposeYaml(text);
  const parsed = normalizeCompose(root, warnings);
  const candidate = convertToCandidate(parsed, warnings, options.categoryOverrides ?? {});

  return {
    importerVersion: IMPORTER_VERSION,
    parsed,
    candidate,
    warnings: warnings.collected(),
  };
}
