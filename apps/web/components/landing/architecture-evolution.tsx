"use client";

import { cx } from "@axon/ui";
import { useMemo, useState } from "react";

import { ArchitectureChangeLegend } from "./architecture-change-legend";
import { ArchitectureChangeSummary } from "./architecture-change-summary";
import { ArchitectureDiffCanvas } from "./architecture-diff-canvas";
import {
  ArchitectureDiffControls,
  evolutionTabId,
  type EvolutionView,
} from "./architecture-diff-controls";
import {
  CURRENT_GAPS,
  CURRENT_GRAPH,
  RECOMMENDED_ARCHITECTURE,
  computeDiff,
  graphNode,
} from "@/data/recommended-architecture";

export function ArchitectureEvolution() {
  const [view, setView] = useState<EvolutionView>("current");
  const diff = useMemo(computeDiff, []);

  return (
    <section
      id="architecture-evolution"
      aria-labelledby="evolution-heading"
      className="scroll-mt-14 border-t border-border px-5 py-16 md:px-8 lg:px-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <h2 id="evolution-heading" className="type-headline-lg max-w-2xl text-balance">
          See what should change—and why.
        </h2>
        <p className="type-body-lg mt-4 max-w-2xl text-foreground-muted">
          Compare the current system with a recommended architecture built from audit evidence,
          simulation results, and explicit assumptions.
        </p>
        <p className="type-label-caps mt-3 text-accent">Interactive architecture preview</p>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <ArchitectureDiffControls view={view} onViewChange={setView} />
          <ArchitectureChangeLegend />
        </div>

        <div
          role="tabpanel"
          id="evolution-panel"
          aria-labelledby={evolutionTabId(view)}
          tabIndex={0}
          className="mt-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {view === "current" && (
            <div className="flex flex-col gap-6">
              <ArchitectureDiffCanvas graph={CURRENT_GRAPH} gaps={CURRENT_GAPS} />
              <ul aria-label="Current weaknesses" className="flex flex-col gap-1.5">
                {CURRENT_GAPS.map((gap) => (
                  <li
                    key={gap.id}
                    className={cx(
                      "type-mono-data",
                      gap.healthy === true ? "text-success" : "text-critical",
                    )}
                  >
                    <span aria-hidden>{gap.healthy === true ? "✓" : "▲"} </span>
                    {gap.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {view === "recommended" && (
            <div className="flex flex-col gap-6">
              <ArchitectureDiffCanvas
                graph={RECOMMENDED_ARCHITECTURE.resultingGraph}
                nodeStates={diff.nodeStates}
              />
              <ArchitectureChangeSummary />
            </div>
          )}
          {view === "diff" && (
            <div className="flex flex-col gap-6">
              <ArchitectureDiffCanvas
                graph={RECOMMENDED_ARCHITECTURE.resultingGraph}
                nodeStates={diff.nodeStates}
                emphasizeChanges
              />
              <div className="grid items-start gap-6 lg:grid-cols-2">
                <div className="border-2 border-border-strong bg-surface">
                  <p className="type-label-caps border-b border-border p-3 text-foreground-muted">
                    Connection changes
                  </p>
                  <ul className="flex flex-col divide-y divide-border">
                    {diff.edgeChanges.map((change) => (
                      <li key={`${change.kind}-${change.edge.id}`} className="p-3">
                        <span className="flex flex-wrap items-center gap-2">
                          <span
                            className={cx(
                              "type-mono-data border px-1 py-0.5",
                              change.kind === "added"
                                ? "border-accent bg-accent-muted text-foreground"
                                : "border-critical bg-critical-muted text-foreground",
                            )}
                          >
                            <span aria-hidden>{change.kind === "added" ? "+" : "−"} </span>
                            {change.kind === "added" ? "Added" : "Removed"}
                          </span>
                          <span
                            className={cx(
                              "type-mono-data text-foreground",
                              change.kind === "removed" && "line-through",
                            )}
                          >
                            {
                              graphNode(RECOMMENDED_ARCHITECTURE.resultingGraph, change.edge.source)
                                .name
                            }{" "}
                            →{" "}
                            {
                              graphNode(RECOMMENDED_ARCHITECTURE.resultingGraph, change.edge.target)
                                .name
                            }{" "}
                            ({change.edge.kind})
                          </span>
                        </span>
                        <span className="type-body-md mt-1 block text-foreground-muted">
                          {change.reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <ArchitectureChangeSummary />
              </div>
            </div>
          )}
        </div>

        <p className="sr-only" aria-live="polite">
          Showing the {view} architecture view.
        </p>
        <p className="type-mono-data mt-6 text-foreground-muted">
          Preview derived from audit findings — no infrastructure or code has been modified.
        </p>
      </div>
    </section>
  );
}
