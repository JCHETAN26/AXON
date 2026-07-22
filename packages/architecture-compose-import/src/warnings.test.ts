import { describe, expect, it } from "vitest";

import { importCompose } from "./import-compose";
import { sortWarnings, WarningCollector } from "./warnings";

function warningsFor(text: string) {
  return importCompose(text).warnings;
}

describe("unsupported-feature warnings", () => {
  it("reports include without resolving it", () => {
    const warnings = warningsFor("include:\n  - other.yaml\nservices:\n  api:\n    image: node");
    expect(warnings.find((w) => w.code === "include")).toMatchObject({ severity: "unsupported" });
  });

  it("reports build, env_file, extends, and host mounts", () => {
    const warnings = warningsFor(`
services:
  api:
    build: ./api
    env_file: .env
    extends:
      service: base
    volumes:
      - ./local:/app
`);
    const codes = warnings.map((w) => w.code);
    expect(codes).toContain("build-context");
    expect(codes).toContain("env-file");
    expect(codes).toContain("extends");
    expect(codes).toContain("host-mount");
  });

  it("reports external resources and file-backed secrets without reading them", () => {
    const warnings = warningsFor(`
services:
  api:
    image: node
    secrets:
      - api_key
networks:
  shared:
    external: true
secrets:
  api_key:
    file: ./secret.txt
`);
    expect(warnings.some((w) => w.code === "external-resource")).toBe(true);
    expect(warnings.some((w) => w.code === "resource-file")).toBe(true);
    expect(warnings.some((w) => w.code === "secret-config-ref")).toBe(true);
  });

  it("flags variable interpolation as unresolved", () => {
    const warnings = warningsFor("services:\n  api:\n    image: myapp:${TAG}");
    expect(warnings.find((w) => w.code === "interpolation")).toMatchObject({ severity: "review" });
  });

  it("every warning explains its effect on confidence", () => {
    for (const warning of warningsFor("include:\n  - x.yaml\nservices:\n  api:\n    build: .")) {
      expect(warning.effect.length).toBeGreaterThan(0);
      expect(warning.message.length).toBeGreaterThan(0);
    }
  });
});

describe("sortWarnings", () => {
  it("orders unsupported before review before info, then by code and target", () => {
    const collector = new WarningCollector();
    collector.info("z-info", "b", "m", "e");
    collector.unsupported("b-unsup", "z", "m", "e");
    collector.unsupported("a-unsup", "a", "m", "e");
    collector.review("m-review", "a", "m", "e");
    const ordered = sortWarnings(collector.collected()).map((w) => w.code);
    expect(ordered).toEqual(["a-unsup", "b-unsup", "m-review", "z-info"]);
  });
});
