import { type ImportWarning, type WarningSeverity } from "./types";

const SEVERITY_RANK: Record<WarningSeverity, number> = {
  unsupported: 0,
  review: 1,
  info: 2,
};

/**
 * Deterministic ordering: unsupported first, then by code, then by target, so
 * the same document always yields the same warning sequence.
 */
export function sortWarnings(warnings: readonly ImportWarning[]): ImportWarning[] {
  return [...warnings].sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (bySeverity !== 0) return bySeverity;
    if (a.code !== b.code) return a.code < b.code ? -1 : 1;
    return a.target < b.target ? -1 : a.target > b.target ? 1 : 0;
  });
}

/**
 * Collects a warning. A small helper so detectors read declaratively and every
 * warning carries a consistent shape.
 */
export class WarningCollector {
  private readonly warnings: ImportWarning[] = [];

  add(warning: ImportWarning): void {
    this.warnings.push(warning);
  }

  unsupported(code: string, target: string, message: string, effect: string): void {
    this.add({ code, severity: "unsupported", target, message, effect });
  }

  review(code: string, target: string, message: string, effect: string): void {
    this.add({ code, severity: "review", target, message, effect });
  }

  info(code: string, target: string, message: string, effect: string): void {
    this.add({ code, severity: "info", target, message, effect });
  }

  collected(): ImportWarning[] {
    return sortWarnings(this.warnings);
  }
}
