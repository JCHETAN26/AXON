"use client";

import "@xyflow/react/dist/style.css";

import { type ArchitectureDocument } from "@axon/diagram-schema";
import { useTheme } from "@axon/ui";
import { Background, BackgroundVariant, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import { useMemo } from "react";

import { ArchitectureFlowEdge } from "./architecture-flow-edge";
import { ArchitectureFlowNode } from "./architecture-flow-node";
import { documentToCanvasState } from "@/lib/canvas/adapters";

const NODE_TYPES = { architecture: ArchitectureFlowNode };
const EDGE_TYPES = { architecture: ArchitectureFlowEdge };

export interface ReadOnlyArchitectureCanvasProps {
  document: ArchitectureDocument;
  label: string;
  className?: string;
}

/**
 * The same React Flow renderer as the editor, in a non-interactive mode:
 * no dragging, connecting, selecting, or autosave. Used for the Current and
 * Recommended comparison views so previewing can never modify a document.
 */
function ReadOnlyCanvasInner({ document, label }: ReadOnlyArchitectureCanvasProps) {
  const { resolvedTheme } = useTheme();
  const { nodes, edges } = useMemo(() => documentToCanvasState(document), [document]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      colorMode={resolvedTheme}
      fitView
      minZoom={0.1}
      maxZoom={1.5}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      panOnDrag
      zoomOnScroll={false}
      proOptions={{ hideAttribution: false }}
      aria-label={label}
    >
      <Background variant={BackgroundVariant.Lines} gap={40} color="var(--color-grid)" />
    </ReactFlow>
  );
}

export function ReadOnlyArchitectureCanvas({
  className,
  ...props
}: ReadOnlyArchitectureCanvasProps) {
  return (
    <div
      className={
        className ??
        "h-[420px] w-full overflow-hidden rounded-module border-2 border-border-strong bg-surface"
      }
    >
      <ReactFlowProvider>
        <ReadOnlyCanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
