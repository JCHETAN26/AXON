/**
 * Scans the built browser bundle for accidentally-included server secrets.
 * Run AFTER `pnpm build`:  pnpm verify:client-bundle
 *
 * Reports only safe fingerprints and variable names — never a secret value.
 * Exits non-zero if a confirmed leak is found. Also inspects any shipped source
 * maps. Static scanning has limits (see lib/verify/bundle-scan.ts).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { scanTextForSecrets, type SecretFinding } from "../lib/verify/bundle-scan";

// Client-served artifacts only. Server chunks legitimately hold secrets.
const SCAN_DIRS = [".next/static"];
const SCAN_EXTENSIONS = [".js", ".mjs", ".map", ".css"];

function walk(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (SCAN_EXTENSIONS.some((ext) => full.endsWith(ext))) out.push(full);
  }
  return out;
}

function main(): void {
  const findings: SecretFinding[] = [];
  let scanned = 0;
  for (const dir of SCAN_DIRS) {
    for (const file of walk(dir)) {
      scanned += 1;
      const text = readFileSync(file, "utf8");
      findings.push(...scanTextForSecrets(file, text, process.env));
    }
  }

  console.info(`Scanned ${String(scanned)} client artifact(s).`);
  if (findings.length > 0) {
    console.error(`FAIL: ${String(findings.length)} potential secret leak(s):`);
    for (const finding of findings) {
      console.error(
        `  - ${finding.source} in ${finding.file} (fingerprint ${finding.fingerprint})`,
      );
    }
    console.error("Values are redacted. Remove the leak and rebuild.");
    process.exit(1);
  }
  console.info("OK: no server secrets found in the client bundle.");
  console.info("Note: static scanning cannot guarantee a transformed/split secret is absent.");
}

main();
