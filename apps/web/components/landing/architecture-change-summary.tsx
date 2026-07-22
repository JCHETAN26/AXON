import { cx } from "@axon/ui";

import {
  DIFF_STATE_CHIP_CLASSES,
  DIFF_STATE_GLYPH,
  DIFF_STATE_LABEL,
} from "./architecture-change-legend";
import {
  RECOMMENDED_ARCHITECTURE,
  findingCode,
  graphNode,
  type ArchitecturePatchOperation,
  type DiffState,
} from "@/data/recommended-architecture";

function operationState(operation: ArchitecturePatchOperation): DiffState {
  switch (operation.type) {
    case "add-node":
      return operation.node.planned === true ? "planned" : "added";
    case "add-edge":
      return "added";
    case "update-node":
      return "modified";
    case "remove-edge":
      return "removed";
  }
}

function operationDescription(operation: ArchitecturePatchOperation): string {
  const graph = RECOMMENDED_ARCHITECTURE.resultingGraph;
  switch (operation.type) {
    case "add-node":
      return operation.node.name;
    case "update-node":
      return `${graphNode(graph, operation.nodeId).name} — ${operation.changes.metrics ?? "updated"}`;
    case "add-edge":
      return `${graphNode(graph, operation.edge.source).name} → ${graphNode(graph, operation.edge.target).name} (${operation.edge.kind})`;
    case "remove-edge":
      return operation.edgeId.replace("-", " → ");
  }
}

export function ArchitectureChangeSummary() {
  const counts = new Map<DiffState, number>();
  for (const operation of RECOMMENDED_ARCHITECTURE.operations) {
    const state = operationState(operation);
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }

  return (
    <div className="border-2 border-border-strong bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
        <p className="type-label-caps text-foreground-muted">Change summary</p>
        <p className="type-mono-data text-foreground-muted">
          {(["added", "modified", "removed", "planned"] as const)
            .map((state) => `${counts.get(state) ?? 0} ${DIFF_STATE_LABEL[state].toLowerCase()}`)
            .join(" · ")}
        </p>
      </div>
      <ol className="flex max-h-96 flex-col divide-y divide-border overflow-y-auto">
        {RECOMMENDED_ARCHITECTURE.operations.map((operation, index) => {
          const state = operationState(operation);
          return (
            <li key={index} className="flex flex-col gap-1 p-3">
              <span className="flex flex-wrap items-center gap-2">
                <span
                  className={cx(
                    "type-mono-data border px-1 py-0.5",
                    DIFF_STATE_CHIP_CLASSES[state],
                  )}
                >
                  <span aria-hidden>{DIFF_STATE_GLYPH[state]} </span>
                  {DIFF_STATE_LABEL[state]}
                </span>
                <span
                  className={cx(
                    "type-mono-data text-foreground",
                    state === "removed" && "line-through",
                  )}
                >
                  {operationDescription(operation)}
                </span>
              </span>
              <span className="type-body-md text-foreground-muted">{operation.reason}</span>
              <span className="flex flex-wrap gap-1.5">
                {operation.sourceFindingIds.map((findingId) => (
                  <a
                    key={findingId}
                    href="#architecture-audit"
                    className="type-label-caps border border-border px-1.5 py-0.5 text-foreground-muted hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {findingCode(findingId)}
                  </a>
                ))}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
