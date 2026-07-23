import { parse as parseToml } from "smol-toml";

import { type RawEvidence } from "../schemas";
import { lookupTech } from "../tech-catalog";

/**
 * Dependency-manifest extractors. A dependency listing is *weak* evidence — it
 * says a library is available, not that the service is actively used — so all
 * evidence here is confidence "low". Only names present in the tech catalog
 * become evidence; unknown dependencies are ignored.
 */

function dependencyEvidence(
  filePath: string,
  extractor: string,
  name: string,
): RawEvidence | null {
  const tech = lookupTech(name);
  if (tech === undefined) return null;
  return {
    filePath,
    evidenceType: "dependency",
    extractor,
    excerpt: name,
    fact: { name, technology: tech.technology, category: tech.category },
    confidence: "low",
  };
}

export function extractPackageJson(filePath: string, text: string): RawEvidence[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return [];
  }
  if (typeof json !== "object" || json === null) return [];
  const record = json as Record<string, unknown>;
  const names = new Set<string>();
  for (const key of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    const section = record[key];
    if (typeof section === "object" && section !== null) {
      for (const name of Object.keys(section)) names.add(name);
    }
  }
  return [...names]
    .map((name) => dependencyEvidence(filePath, "package-json", name))
    .filter((e): e is RawEvidence => e !== null);
}

export function extractRequirementsTxt(filePath: string, text: string): RawEvidence[] {
  const out: RawEvidence[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#") || trimmed.startsWith("-")) continue;
    // Strip version specifiers / extras: "package[extra]==1.2 ; marker".
    const name = trimmed.split(/[<>=!~;[\s]/)[0]?.trim();
    if (name === undefined || name === "") continue;
    const evidence = dependencyEvidence(filePath, "requirements-txt", name);
    if (evidence !== null) out.push(evidence);
  }
  return out;
}

export function extractPyproject(filePath: string, text: string): RawEvidence[] {
  let doc: unknown;
  try {
    doc = parseToml(text);
  } catch {
    return [];
  }
  const names = new Set<string>();
  const record = doc as Record<string, unknown>;
  // PEP 621 [project].dependencies = ["pkg>=1", ...]
  const project = record.project as Record<string, unknown> | undefined;
  const projectDeps = project?.dependencies;
  if (Array.isArray(projectDeps)) {
    for (const dep of projectDeps) {
      if (typeof dep === "string") {
        const name = dep.split(/[<>=!~;[\s]/)[0]?.trim();
        if (name !== undefined && name !== "") names.add(name);
      }
    }
  }
  // Poetry [tool.poetry.dependencies] = { pkg = "^1" }
  const tool = record.tool as Record<string, unknown> | undefined;
  const poetry = tool?.poetry as Record<string, unknown> | undefined;
  const poetryDeps = poetry?.dependencies as Record<string, unknown> | undefined;
  if (poetryDeps !== undefined) {
    for (const name of Object.keys(poetryDeps)) {
      if (name.toLowerCase() !== "python") names.add(name);
    }
  }
  return [...names]
    .map((name) => dependencyEvidence(filePath, "pyproject-toml", name))
    .filter((e): e is RawEvidence => e !== null);
}

export function extractGoMod(filePath: string, text: string): RawEvidence[] {
  const out: RawEvidence[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    // A require line: "module/path v1.2.3" (inside or outside a require block).
    const match = /^(?:require\s+)?([a-z0-9./_-]+\.[a-z0-9./_-]+)\s+v[0-9]/i.exec(trimmed);
    const modulePath = match?.[1];
    if (modulePath === undefined) continue;
    const evidence = dependencyEvidence(filePath, "go-mod", modulePath);
    if (evidence !== null) out.push(evidence);
  }
  return out;
}
