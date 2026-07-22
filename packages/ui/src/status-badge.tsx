import { type ReactNode } from "react";

import { cx } from "./cx";
import { CheckIcon, CircleIcon, CrossIcon, InfoIcon, TriangleIcon } from "./icons";

export type StatusKind = "critical" | "warning" | "success" | "info" | "neutral";

export interface StatusBadgeProps {
  kind: StatusKind;
  children: ReactNode;
  className?: string;
}

/**
 * Status is never communicated by color alone: every kind pairs its palette
 * with a distinct icon shape and a visible text label.
 */
const KIND_META: Record<StatusKind, { icon: ReactNode; className: string }> = {
  critical: {
    icon: <CrossIcon width={10} height={10} strokeWidth={2.5} />,
    className: "border-critical bg-critical-muted text-critical",
  },
  warning: {
    icon: <TriangleIcon width={10} height={10} strokeWidth={2} />,
    className: "border-warning bg-warning-muted text-warning",
  },
  success: {
    icon: <CheckIcon width={10} height={10} strokeWidth={2.5} />,
    className: "border-success bg-success-muted text-success",
  },
  info: {
    icon: <InfoIcon width={10} height={10} strokeWidth={2} />,
    className: "border-accent bg-accent-muted text-accent",
  },
  neutral: {
    icon: <CircleIcon width={10} height={10} strokeWidth={2} />,
    className: "border-border-strong bg-surface-muted text-foreground-muted",
  },
};

export function StatusBadge({ kind, children, className }: StatusBadgeProps) {
  const meta = KIND_META[kind];
  return (
    <span
      className={cx(
        "type-label-caps inline-flex items-center gap-1.5 rounded-control border px-2 py-1",
        meta.className,
        className,
      )}
    >
      {meta.icon}
      {children}
    </span>
  );
}
