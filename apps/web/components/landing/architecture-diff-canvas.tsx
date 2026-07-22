import { cx } from "@axon/ui";

import {
  DIFF_STATE_CHIP_CLASSES,
  DIFF_STATE_GLYPH,
  DIFF_STATE_LABEL,
} from "./architecture-change-legend";
import { DEMO_GROUPS } from "@/data/demo-architecture";
import {
  type ArchitectureGraph,
  type CurrentGap,
  type DiffState,
  type GraphNodeId,
} from "@/data/recommended-architecture";

export interface ArchitectureDiffCanvasProps {
  graph: ArchitectureGraph;
  /** Per-node diff states; nodes without an entry render as unchanged. */
  nodeStates?: ReadonlyMap<GraphNodeId, DiffState> | undefined;
  /** Dim unchanged nodes so changes carry the view (Diff view). */
  emphasizeChanges?: boolean;
  /** Baseline weaknesses to mark on nodes (Current view). */
  gaps?: readonly CurrentGap[] | undefined;
}

/**
 * Grouped chip rendering of an architecture graph with explicit, non-color
 * state markers. Shared by the Current / Recommended / Diff views.
 */
export function ArchitectureDiffCanvas({
  graph,
  nodeStates,
  emphasizeChanges = false,
  gaps,
}: ArchitectureDiffCanvasProps) {
  return (
    <div className="bg-canvas-grid grid grid-cols-2 gap-3 border border-border p-4 xl:grid-cols-4">
      {DEMO_GROUPS.map((group) => (
        <section
          key={group.id}
          aria-label={group.label}
          className="border border-dashed border-border-strong p-2"
        >
          <p className="type-label-caps mb-2 text-foreground-muted">{group.label}</p>
          <ul className="flex flex-col gap-2">
            {graph.nodes
              .filter((node) => node.groupId === group.id)
              .map((node) => {
                const state: DiffState =
                  nodeStates?.get(node.id) ?? (node.planned === true ? "planned" : "unchanged");
                const nodeGaps = gaps?.filter((gap) => gap.nodeId === node.id) ?? [];
                const showStateTag = state !== "unchanged";
                return (
                  <li
                    key={node.id}
                    className={cx(
                      "border-2 bg-surface px-2 py-1.5",
                      state === "added" && "border-accent",
                      state === "modified" && "border-warning",
                      state === "planned" && "border-dashed border-border-strong",
                      state === "unchanged" && "border-border",
                      emphasizeChanges && state === "unchanged" && "opacity-50",
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="type-mono-data block truncate text-foreground">
                          {node.name}
                        </span>
                        <span className="type-label-caps text-foreground-muted">
                          {node.category}
                        </span>
                      </span>
                      {showStateTag && (
                        <span
                          className={cx(
                            "type-mono-data shrink-0 border px-1 py-0.5",
                            DIFF_STATE_CHIP_CLASSES[state],
                          )}
                        >
                          <span aria-hidden>{DIFF_STATE_GLYPH[state]} </span>
                          {DIFF_STATE_LABEL[state]}
                        </span>
                      )}
                    </span>
                    <span className="type-mono-data block text-foreground-muted">
                      {node.metrics}
                    </span>
                    {nodeGaps.map((gap) => (
                      <span
                        key={gap.id}
                        className={cx(
                          "type-mono-data mt-1 block",
                          gap.healthy === true ? "text-success" : "text-critical",
                        )}
                      >
                        <span aria-hidden>{gap.healthy === true ? "✓" : "▲"} </span>
                        {gap.label}
                      </span>
                    ))}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
