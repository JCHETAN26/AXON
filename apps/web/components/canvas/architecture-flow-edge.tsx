"use client";

import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

import { type CanvasEdge } from "@/lib/canvas/adapters";

/** Dash semantics per docs/design/DESIGN.md §11 (shared with the landing legend). */
const KIND_DASH: Record<string, string | undefined> = {
  sync: undefined,
  async: "5 5",
  data: "11 5",
  telemetry: "2 5",
};

export function ArchitectureFlowEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<CanvasEdge>) {
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 2,
  });

  const kind = data?.kind ?? "sync";
  return (
    <BaseEdge
      path={path}
      {...(markerEnd !== undefined && { markerEnd })}
      style={{
        stroke: selected === true ? "var(--color-accent)" : "var(--color-border-strong)",
        strokeWidth: selected === true ? 2 : 1.25,
        strokeDasharray: KIND_DASH[kind],
        opacity: kind === "telemetry" && selected !== true ? 0.6 : 1,
      }}
    />
  );
}
