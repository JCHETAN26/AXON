"use client";

import { useState } from "react";

import { ArchitectureMiniMap } from "./architecture-mini-map";
import { AuditEvidencePanel } from "./audit-evidence-panel";
import { findingTabId } from "./audit-finding-item";
import { AuditFindingList } from "./audit-finding-list";
import { DEMO_FINDINGS } from "@/data/demo-architecture";

export function ArchitectureAudit() {
  const firstFinding = DEMO_FINDINGS[0];
  const [selectedId, setSelectedId] = useState(firstFinding?.id ?? "");
  const selectedFinding =
    DEMO_FINDINGS.find((finding) => finding.id === selectedId) ?? firstFinding;

  if (selectedFinding === undefined) {
    return null;
  }

  return (
    <section
      id="architecture-audit"
      aria-labelledby="audit-heading"
      className="border-t border-border px-5 py-16 md:px-8 lg:px-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <h2 id="audit-heading" className="type-headline-lg max-w-2xl text-balance">
          A beautiful diagram is not enough.
        </h2>
        <p className="type-body-lg mt-4 max-w-2xl text-foreground-muted">
          AXON examines architecture structure, infrastructure evidence, and runtime assumptions to
          identify what can fail, why it matters, and what should change.
        </p>
        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[2fr_3fr] lg:gap-12">
          <AuditFindingList selectedId={selectedFinding.id} onSelect={setSelectedId} />
          <div className="flex flex-col gap-6">
            <div className="bg-canvas-grid border border-border p-4">
              <ArchitectureMiniMap highlightedNodeId={selectedFinding.nodeId} />
            </div>
            <AuditEvidencePanel
              finding={selectedFinding}
              labelledBy={findingTabId(selectedFinding.id)}
            />
          </div>
        </div>
        <p aria-live="polite" className="sr-only">
          Selected finding: {selectedFinding.title}
        </p>
      </div>
    </section>
  );
}
