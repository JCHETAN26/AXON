import { StatusBadge, cx } from "@axon/ui";
import { type KeyboardEvent, type Ref } from "react";

import { SEVERITY_LABEL, SEVERITY_TO_KIND } from "./audit-finding-marker";
import { getNode, type DemoFinding } from "@/data/demo-architecture";

export function findingTabId(findingId: string): string {
  return `finding-tab-${findingId}`;
}

export interface AuditFindingItemProps {
  finding: DemoFinding;
  selected: boolean;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  ref?: Ref<HTMLButtonElement>;
}

export function AuditFindingItem({
  finding,
  selected,
  onSelect,
  onKeyDown,
  ref,
}: AuditFindingItemProps) {
  const node = getNode(finding.nodeId);
  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      id={findingTabId(finding.id)}
      aria-selected={selected}
      aria-controls="audit-evidence-panel"
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      className={cx(
        "border-2 bg-surface p-4 text-left transition-colors",
        "motion-safe:duration-(--duration-fast) motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        selected
          ? "border-accent shadow-[4px_4px_0_0_var(--color-accent-muted)]"
          : "border-border hover:border-border-strong",
      )}
    >
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusBadge kind={SEVERITY_TO_KIND[finding.severity]}>
          {SEVERITY_LABEL[finding.severity]}
        </StatusBadge>
        <span className="type-mono-data text-foreground-muted">{node.name}</span>
        <span className="type-mono-data ml-auto text-foreground-muted">{finding.confidence}%</span>
      </span>
      <span className="type-body-md mt-2 block font-medium text-foreground">{finding.title}</span>
    </button>
  );
}
