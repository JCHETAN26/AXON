"use client";

import { type ArchitectureEdgeKindModel } from "@axon/diagram-schema";
import { Button, cx } from "@axon/ui";

import { type CanvasEdge, type CanvasNode } from "@/lib/canvas/adapters";

const KIND_LABEL: Record<ArchitectureEdgeKindModel, string> = {
  sync: "Synchronous request",
  async: "Async event",
  data: "Data access",
  telemetry: "Telemetry",
};

const KINDS: readonly ArchitectureEdgeKindModel[] = ["sync", "async", "data", "telemetry"];

export interface EdgeInspectorProps {
  edge: CanvasEdge;
  nodes: readonly CanvasNode[];
  onKindChange: (kind: ArchitectureEdgeKindModel) => void;
  onDelete: () => void;
}

export function EdgeInspector({ edge, nodes, onKindChange, onDelete }: EdgeInspectorProps) {
  const sourceName = nodes.find((node) => node.id === edge.source)?.data.name ?? edge.source;
  const targetName = nodes.find((node) => node.id === edge.target)?.data.name ?? edge.target;

  return (
    <div className="flex flex-col gap-4">
      <p className="type-label-caps text-foreground-muted">Connection</p>
      <p className="type-mono-data text-foreground">
        {sourceName} <span aria-hidden>→</span>
        <span className="sr-only">to</span> {targetName}
      </p>
      <div>
        <label htmlFor="inspector-edge-kind" className="type-label-caps text-foreground-muted">
          Connection kind
        </label>
        <select
          id="inspector-edge-kind"
          value={edge.data?.kind ?? "sync"}
          onChange={(event) => {
            onKindChange(event.target.value as ArchitectureEdgeKindModel);
          }}
          className={cx(
            "type-body-md mt-1.5 w-full rounded-control border-2 border-border-strong bg-surface px-2.5 py-2",
            "text-foreground focus:border-accent focus:outline-none",
          )}
        >
          {KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABEL[kind]}
            </option>
          ))}
        </select>
      </div>
      <p className="type-mono-data text-foreground-muted">id: {edge.id}</p>
      <Button
        variant="technical"
        size="sm"
        onClick={onDelete}
        className="self-start hover:border-critical hover:text-critical"
      >
        Delete Connection
      </Button>
    </div>
  );
}
