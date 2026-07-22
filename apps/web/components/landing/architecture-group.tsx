import { cx } from "@axon/ui";
import { type ReactNode } from "react";

export interface ArchitectureGroupProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * Group boundary per docs/design/DESIGN.md §12: fine dashed border, small
 * uppercase label, minimal background tint.
 */
export function ArchitectureGroup({ label, children, className }: ArchitectureGroupProps) {
  return (
    <section
      aria-label={label}
      className={cx("border border-dashed border-border-strong p-3", className)}
    >
      <p className="type-label-caps mb-3 text-foreground-muted">{label}</p>
      <div className="flex flex-col gap-6">{children}</div>
    </section>
  );
}
