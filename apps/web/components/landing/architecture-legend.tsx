import { cx } from "@axon/ui";

import { EDGE_KIND_LABEL, EDGE_KIND_STYLE } from "./architecture-edge";
import { type EdgeKind } from "@/data/demo-architecture";

const LEGEND_KINDS: readonly EdgeKind[] = ["sync", "async", "data", "telemetry"];

function LegendSwatch({
  dash,
  strokeClass,
  width,
}: {
  dash?: string | undefined;
  strokeClass: string;
  width: number;
}) {
  return (
    <svg width={28} height={8} aria-hidden className="shrink-0">
      <line
        x1={0}
        y1={4}
        x2={28}
        y2={4}
        strokeDasharray={dash}
        strokeWidth={width}
        className={strokeClass}
      />
    </svg>
  );
}

/**
 * Compact legend mapping edge patterns to their semantic meaning.
 */
export function ArchitectureLegend({ className }: { className?: string }) {
  return (
    <dl
      aria-label="Connection legend"
      className={cx("flex flex-wrap items-center gap-x-6 gap-y-2", className)}
    >
      {LEGEND_KINDS.map((kind) => {
        const style = EDGE_KIND_STYLE[kind];
        return (
          <div key={kind} className="flex items-center gap-2">
            <dt className="flex items-center">
              <LegendSwatch dash={style.dash} strokeClass={style.strokeClass} width={style.width} />
            </dt>
            <dd className="type-mono-data text-foreground-muted">{EDGE_KIND_LABEL[kind]}</dd>
          </div>
        );
      })}
      <div className="flex items-center gap-2">
        <dt className="flex items-center">
          <LegendSwatch strokeClass="stroke-accent" width={2} />
        </dt>
        <dd className="type-mono-data text-accent">Active request path</dd>
      </div>
    </dl>
  );
}
