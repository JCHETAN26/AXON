import { type DemoEdge, type EdgeKind } from "@/data/demo-architecture";

interface EdgeKindStyle {
  /** SVG dash pattern; undefined renders a solid line. */
  dash?: string;
  strokeClass: string;
  markerId: string;
  width: number;
}

/**
 * Edge patterns follow docs/design/DESIGN.md §11: solid = synchronous request,
 * short dash = asynchronous event, long dash = data access, fine dotted =
 * telemetry. Shared with the legend so the two never drift apart.
 */
export const EDGE_KIND_STYLE: Record<EdgeKind, EdgeKindStyle> = {
  sync: { strokeClass: "stroke-border-strong", markerId: "axon-arrow", width: 1.25 },
  async: { dash: "5 5", strokeClass: "stroke-border-strong", markerId: "axon-arrow", width: 1.25 },
  data: { dash: "11 5", strokeClass: "stroke-border-strong", markerId: "axon-arrow", width: 1.25 },
  telemetry: {
    dash: "2 5",
    strokeClass: "stroke-border-strong opacity-50",
    markerId: "axon-arrow-faint",
    width: 1,
  },
};

export const EDGE_KIND_LABEL: Record<EdgeKind, string> = {
  sync: "Synchronous request",
  async: "Async event",
  data: "Data access",
  telemetry: "Telemetry",
};

/**
 * Arrowhead definitions shared by every edge. `userSpaceOnUse` keeps the
 * arrow size constant regardless of stroke width.
 */
export function ArrowMarkerDefs() {
  const markers: { id: string; fillClass: string }[] = [
    { id: "axon-arrow", fillClass: "fill-border-strong" },
    { id: "axon-arrow-active", fillClass: "fill-accent" },
    { id: "axon-arrow-faint", fillClass: "fill-border" },
  ];
  return (
    <defs>
      {markers.map(({ id, fillClass }) => (
        <marker
          key={id}
          id={id}
          markerWidth={8}
          markerHeight={8}
          refX={7}
          refY={4}
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0.5 L7,4 L0,7.5 Z" className={fillClass} />
        </marker>
      ))}
    </defs>
  );
}

export interface ArchitectureEdgeProps {
  edge: DemoEdge;
  /** SVG path in the coordinate space of the canvas overlay. */
  d: string;
}

/**
 * One connection in the hero canvas. Active edges render in blueprint blue
 * with a motion-safe flow overlay; inactive edges stay restrained.
 */
export function ArchitectureEdge({ edge, d }: ArchitectureEdgeProps) {
  const style = EDGE_KIND_STYLE[edge.kind];
  return (
    <g>
      <path
        d={d}
        fill="none"
        strokeDasharray={style.dash}
        strokeWidth={edge.active ? 2 : style.width}
        className={edge.active ? "stroke-accent" : style.strokeClass}
        markerEnd={`url(#${edge.active ? "axon-arrow-active" : style.markerId})`}
      />
      {edge.active && (
        <path
          d={d}
          fill="none"
          strokeWidth={2}
          strokeDasharray="4 20"
          strokeLinecap="round"
          className="motion-safe:animate-edge-flow stroke-accent-strong"
        />
      )}
    </g>
  );
}
