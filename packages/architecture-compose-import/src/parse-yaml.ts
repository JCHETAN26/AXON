import { parseDocument, type Document } from "yaml";

import { ComposeImportError } from "./errors";
import { IMPORT_LIMITS } from "./limits";

/**
 * Parses untrusted Compose YAML into a plain JavaScript value, safely.
 *
 * Safety guarantees, all enforced here:
 * - The `yaml` parser never executes code or evaluates custom tags as code.
 * - No filesystem, network, or environment access happens during parsing.
 * - Alias expansion is capped (YAML-bomb defence).
 * - Oversized documents, over-deep nesting, and over-long scalars are rejected
 *   rather than materialised.
 * - Explicit custom tags (`!something`) are rejected — the importer models a
 *   plain data document, not a tagged one.
 */
export function parseComposeYaml(text: string): unknown {
  const byteLength = typeof Buffer !== "undefined" ? Buffer.byteLength(text, "utf8") : text.length;
  if (byteLength > IMPORT_LIMITS.maxBytes) {
    throw new ComposeImportError(
      "too-large",
      `Document exceeds the ${String(IMPORT_LIMITS.maxBytes)}-byte limit.`,
    );
  }
  if (text.trim() === "") {
    throw new ComposeImportError("empty", "The document is empty.");
  }

  let doc: Document.Parsed;
  try {
    doc = parseDocument(text, {
      // No custom tag resolvers: unknown tags surface as parser warnings, and
      // scalars are never coerced through user-defined logic. The alias cap is
      // applied at materialisation time (toJS), below.
      customTags: [],
      // A missing anchor / bad structure should error, not be silently patched.
      strict: true,
      logLevel: "silent",
    });
  } catch (error) {
    throw new ComposeImportError(
      "invalid-yaml",
      error instanceof Error ? error.message : "The document is not valid YAML.",
    );
  }

  if (doc.errors.length > 0) {
    throw new ComposeImportError("invalid-yaml", doc.errors[0]?.message ?? "Invalid YAML.");
  }

  // Any explicit tag beyond the standard core tags is refused: the importer
  // does not interpret tagged nodes.
  assertNoCustomTags(doc);

  let value: unknown;
  try {
    // The alias cap is enforced here — an over-referenced document throws
    // rather than expanding in memory.
    value = doc.toJS({ maxAliasCount: IMPORT_LIMITS.maxAliasCount });
  } catch (error) {
    throw new ComposeImportError(
      "unsafe-yaml",
      error instanceof Error ? error.message : "The document could not be safely materialised.",
    );
  }
  assertDepthAndScalars(value, 0);
  return value;
}

/**
 * The only explicit tags the importer accepts — the YAML core schema. Note
 * that `!!anything` expands into the `tag:yaml.org,2002:` namespace, so a
 * prefix check is not enough: unsafe tags like `!!python/object/apply` live in
 * that same namespace and must be rejected by exact allowlist.
 */
const SAFE_TAGS = new Set([
  "tag:yaml.org,2002:str",
  "tag:yaml.org,2002:int",
  "tag:yaml.org,2002:float",
  "tag:yaml.org,2002:bool",
  "tag:yaml.org,2002:null",
  "tag:yaml.org,2002:map",
  "tag:yaml.org,2002:seq",
  "tag:yaml.org,2002:merge",
  "tag:yaml.org,2002:set",
  "tag:yaml.org,2002:timestamp",
]);

function assertNoCustomTags(doc: Document.Parsed): void {
  let rejected: string | null = null;
  visitDocumentNodes(doc.contents, (tag) => {
    if (rejected !== null) return;
    if (!SAFE_TAGS.has(tag)) {
      rejected = tag;
    }
  });
  if (rejected !== null) {
    throw new ComposeImportError(
      "unsafe-yaml",
      `Custom YAML tag "${rejected}" is not supported and will not be evaluated.`,
    );
  }
}

interface TaggedNode {
  tag?: unknown;
  items?: unknown;
  value?: unknown;
  key?: unknown;
}

/** Walks the YAML AST looking only at explicit `tag` markers. */
function visitDocumentNodes(node: unknown, onTag: (tag: string) => void): void {
  if (node === null || typeof node !== "object") return;
  const tagged = node as TaggedNode;
  if (typeof tagged.tag === "string") onTag(tagged.tag);
  if (Array.isArray(tagged.items)) {
    for (const item of tagged.items) visitDocumentNodes(item, onTag);
  }
  if (tagged.key !== undefined) visitDocumentNodes(tagged.key, onTag);
  if (tagged.value !== undefined) visitDocumentNodes(tagged.value, onTag);
}

function assertDepthAndScalars(value: unknown, depth: number): void {
  if (depth > IMPORT_LIMITS.maxDepth) {
    throw new ComposeImportError(
      "too-deep",
      `Document nesting exceeds the depth limit of ${String(IMPORT_LIMITS.maxDepth)}.`,
    );
  }
  if (typeof value === "string" && value.length > IMPORT_LIMITS.maxScalarLength) {
    throw new ComposeImportError(
      "scalar-too-long",
      `A scalar value exceeds the ${String(IMPORT_LIMITS.maxScalarLength)}-character limit.`,
    );
  }
  if (Array.isArray(value)) {
    for (const item of value) assertDepthAndScalars(item, depth + 1);
  } else if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) assertDepthAndScalars(item, depth + 1);
  }
}
