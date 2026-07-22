import { describe, expect, it } from "vitest";

import { ComposeImportError } from "./errors";
import { IMPORT_LIMITS } from "./limits";
import { parseComposeYaml } from "./parse-yaml";

describe("parseComposeYaml", () => {
  it("parses a plain document into a JS object", () => {
    expect(parseComposeYaml("services:\n  api:\n    image: node")).toEqual({
      services: { api: { image: "node" } },
    });
  });

  it("rejects an empty document", () => {
    expect(() => parseComposeYaml("   ")).toThrow(ComposeImportError);
  });

  it("rejects documents over the size limit", () => {
    const huge = `services:\n  api:\n    image: "${"x".repeat(IMPORT_LIMITS.maxBytes)}"`;
    expect(() => parseComposeYaml(huge)).toThrow(/exceeds the .* limit/);
  });

  it("rejects invalid YAML instead of guessing", () => {
    expect(() => parseComposeYaml("services: [unterminated")).toThrow(ComposeImportError);
  });

  it("refuses custom YAML tags rather than evaluating them", () => {
    // A custom tag must never be interpreted as code or a host reference.
    expect(() => parseComposeYaml("value: !!python/object/apply:os.system ['echo hi']")).toThrow(
      /Custom YAML tag/,
    );
    expect(() => parseComposeYaml("value: !secret hunter2")).toThrow(ComposeImportError);
  });

  it("defuses alias-expansion bombs via the alias cap", () => {
    // A modest "billion laughs" — enough aliases to trip the cap, not the heap.
    const bomb = [
      "a: &a [x, x, x, x, x, x, x, x, x, x]",
      "b: &b [*a, *a, *a, *a, *a, *a, *a, *a, *a, *a]",
      "c: &c [*b, *b, *b, *b, *b, *b, *b, *b, *b, *b]",
      "d: [*c, *c, *c, *c, *c, *c, *c, *c, *c, *c]",
      "services:",
      "  api:",
      "    image: node",
    ].join("\n");
    expect(() => parseComposeYaml(bomb)).toThrow(ComposeImportError);
  });

  it("rejects over-deep nesting", () => {
    let nested = "leaf: 1";
    for (let depth = 0; depth < IMPORT_LIMITS.maxDepth + 5; depth += 1) {
      nested = `level:\n  ${nested.replace(/\n/g, "\n  ")}`;
    }
    expect(() => parseComposeYaml(nested)).toThrow(/depth/);
  });

  it("rejects an over-long scalar", () => {
    const long = `services:\n  api:\n    image: "${"y".repeat(IMPORT_LIMITS.maxScalarLength + 1)}"`;
    expect(() => parseComposeYaml(long)).toThrow(/scalar/);
  });

  it("does not resolve environment interpolation — it is left literal", () => {
    const parsed = parseComposeYaml("services:\n  api:\n    image: myapp:${TAG}") as {
      services: { api: { image: string } };
    };
    expect(parsed.services.api.image).toBe("myapp:${TAG}");
  });
});
