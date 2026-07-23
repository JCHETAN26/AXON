import { cx } from "./cx";
import { LockIcon } from "./icons";
import { type ReactNode } from "react";

export type ArchitectureNodeState = "default" | "selected" | "critical" | "recommended" | "planned";

export type ArchitectureNodeHealth = "healthy" | "degraded" | "down";

export interface ArchitectureNodeProps {
  /** Service category, e.g. "Compute" or "Data". Rendered as an uppercase label. */
  category: string;
  /** Service identifier, e.g. "api-gateway". */
  name: string;
  /** Compact technical metadata line, rendered in JetBrains Mono. */
  meta?: string;
  state?: ArchitectureNodeState;
  health?: ArchitectureNodeHealth;
  locked?: boolean;
  icon?: ReactNode;
  className?: string;
}

/**
 * State is communicated by border treatment AND a visible text tag,
 * never by color alone.
 */
const STATE_META: Record<
  Exclude<ArchitectureNodeState, "default">,
  { label: string; container: string; tag: string }
> = {
  selected: {
    label: "Selected",
    container: "border-accent shadow-[6px_6px_0_0_var(--color-accent-muted)]",
    tag: "text-accent",
  },
  critical: {
    label: "Critical",
    container: "border-critical",
    tag: "text-critical",
  },
  recommended: {
    label: "Recommended",
    container: "border-dashed border-accent",
    tag: "text-accent",
  },
  planned: {
    label: "Planned",
    container: "border-dashed border-border-strong",
    tag: "text-foreground-muted",
  },
};

const HEALTH_META: Record<ArchitectureNodeHealth, { label: string; dot: string }> = {
  healthy: { label: "Healthy", dot: "bg-success" },
  degraded: { label: "Degraded", dot: "bg-warning" },
  down: { label: "Down", dot: "bg-critical" },
};

export function ArchitectureNode({
  category,
  name,
  meta,
  state = "default",
  health,
  locked = false,
  icon,
  className,
}: ArchitectureNodeProps) {
  const stateMeta = state === "default" ? null : STATE_META[state];
  const healthMeta = health === undefined ? undefined : HEALTH_META[health];

  return (
    <div
      role="group"
      aria-label={`${name} — ${category}`}
      className={cx(
        "rounded-module border-2 bg-surface p-4",
        stateMeta?.container ?? "border-border-strong",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          {icon !== undefined ? (
            <span className="shrink-0 text-foreground-muted">{icon}</span>
          ) : null}
          <span className="type-label-caps truncate text-foreground-muted">{category}</span>
        </span>
        <span className="flex items-center gap-1.5">
          {locked ? (
            <span className="text-foreground-muted" title="Locked">
              <LockIcon width={12} height={12} />
              <span className="sr-only">Locked</span>
            </span>
          ) : null}
          {healthMeta ? (
            <span className="flex items-center gap-1" title={`Health: ${healthMeta.label}`}>
              <span aria-hidden className={cx("size-2 rounded-process", healthMeta.dot)} />
              <span className="sr-only">Health: {healthMeta.label}</span>
            </span>
          ) : null}
        </span>
      </div>
      <p className="font-display mt-2 text-base font-semibold leading-tight text-foreground">
        {name}
      </p>
      {meta !== undefined && <p className="type-mono-data mt-1.5 text-foreground-muted">{meta}</p>}
      {stateMeta ? (
        <p className={cx("type-label-caps mt-3", stateMeta.tag)}>{stateMeta.label}</p>
      ) : null}
    </div>
  );
}
