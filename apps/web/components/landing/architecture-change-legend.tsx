import { cx } from "@axon/ui";

import { type DiffState } from "@/data/recommended-architecture";

export const DIFF_STATE_GLYPH: Record<DiffState, string> = {
  added: "+",
  modified: "~",
  removed: "−",
  planned: "◌",
  unchanged: "·",
};

export const DIFF_STATE_LABEL: Record<DiffState, string> = {
  added: "Added",
  modified: "Modified",
  removed: "Removed",
  planned: "Planned",
  unchanged: "Unchanged",
};

/** Chip treatment per diff state — glyph + label always accompany the color. */
export const DIFF_STATE_CHIP_CLASSES: Record<DiffState, string> = {
  added: "border-accent bg-accent-muted text-foreground",
  modified: "border-warning bg-warning-muted text-foreground",
  removed: "border-critical bg-critical-muted text-foreground line-through",
  planned: "border-dashed border-border-strong bg-surface text-foreground-muted",
  unchanged: "border-border bg-surface text-foreground-muted",
};

const LEGEND_ORDER: readonly DiffState[] = ["added", "modified", "removed", "planned", "unchanged"];

export function ArchitectureChangeLegend({ className }: { className?: string }) {
  return (
    <dl aria-label="Change legend" className={cx("flex flex-wrap items-center gap-3", className)}>
      {LEGEND_ORDER.map((state) => (
        <div key={state} className="flex items-center gap-2">
          <dt className={cx("type-mono-data border px-1.5 py-0.5", DIFF_STATE_CHIP_CLASSES[state])}>
            <span aria-hidden>{DIFF_STATE_GLYPH[state]}</span>
            <span className="sr-only">{DIFF_STATE_LABEL[state]} marker</span>
          </dt>
          <dd className="type-mono-data text-foreground-muted">{DIFF_STATE_LABEL[state]}</dd>
        </div>
      ))}
    </dl>
  );
}
