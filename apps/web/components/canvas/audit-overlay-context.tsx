"use client";

import { SEVERITY_RANK, type AuditFinding, type FindingSeverity } from "@axon/architecture-audit";
import { createContext, useContext, useMemo, type ReactNode } from "react";

export interface AuditOverlayEntry {
  /** Highest severity among open findings touching the element. */
  readonly severity: FindingSeverity;
  readonly openCount: number;
}

/**
 * Element id → open-finding summary. Only open findings surface on the
 * canvas: acknowledged ones are deliberately muted, resolved ones are gone.
 */
export function deriveAuditOverlay(
  findings: readonly AuditFinding[],
): ReadonlyMap<string, AuditOverlayEntry> {
  const entries = new Map<string, AuditOverlayEntry>();
  for (const finding of findings) {
    if (finding.state !== "open") continue;
    for (const elementId of finding.elementIds) {
      const existing = entries.get(elementId);
      if (existing === undefined) {
        entries.set(elementId, { severity: finding.severity, openCount: 1 });
        continue;
      }
      entries.set(elementId, {
        severity:
          SEVERITY_RANK[finding.severity] < SEVERITY_RANK[existing.severity]
            ? finding.severity
            : existing.severity,
        openCount: existing.openCount + 1,
      });
    }
  }
  return entries;
}

/**
 * Findings reach flow nodes through context — never through React Flow node
 * data — so overlay changes cannot re-trigger the canvas autosave effect.
 */
const AuditOverlayContext = createContext<ReadonlyMap<string, AuditOverlayEntry>>(new Map());

export function AuditOverlayProvider({
  findings,
  children,
}: {
  findings: readonly AuditFinding[];
  children: ReactNode;
}) {
  const value = useMemo(() => deriveAuditOverlay(findings), [findings]);
  return <AuditOverlayContext.Provider value={value}>{children}</AuditOverlayContext.Provider>;
}

export function useAuditOverlayEntry(elementId: string): AuditOverlayEntry | undefined {
  return useContext(AuditOverlayContext).get(elementId);
}
