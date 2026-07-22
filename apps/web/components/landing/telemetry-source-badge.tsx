import { cx } from "@axon/ui";

import { getNode } from "@/data/demo-architecture";

/** Labels where the overlay data comes from — and that it is simulated. */
export function TelemetrySourceBadge({ className }: { className?: string }) {
  return (
    <p
      className={cx(
        "type-mono-data inline-flex items-center gap-2 border border-border px-2 py-1 text-foreground-muted",
        className,
      )}
    >
      <span aria-hidden className="size-2 rounded-process bg-success" />
      source: {getNode("datadog").name} · simulated preview
    </p>
  );
}
