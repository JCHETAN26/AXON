import { cx } from "@axon/ui";

import { DEMO_GROUPS, DEMO_NODES, type NodeId } from "@/data/demo-architecture";

export interface ArchitectureMiniMapProps {
  /** Nodes to render as present; omitted nodes show as pending outlines. */
  revealedNodeIds?: ReadonlySet<NodeId> | undefined;
  /** Node to emphasize, e.g. the one affected by a selected audit finding. */
  highlightedNodeId?: NodeId | undefined;
  /** Whether group boundaries and labels are visible. */
  showGroups?: boolean;
  className?: string;
}

/**
 * Compact grouped view of the canonical demo architecture. Used wherever a
 * section needs to reference the architecture without repeating the hero's
 * full canvas composition.
 */
export function ArchitectureMiniMap({
  revealedNodeIds,
  highlightedNodeId,
  showGroups = true,
  className,
}: ArchitectureMiniMapProps) {
  return (
    <div className={cx("grid grid-cols-2 gap-3 xl:grid-cols-4", className)}>
      {DEMO_GROUPS.map((group) => (
        <section
          key={group.id}
          aria-label={group.label}
          className={cx(
            "p-2 transition-colors motion-safe:duration-(--duration-standard)",
            showGroups ? "border border-dashed border-border-strong" : "border border-transparent",
          )}
        >
          <p
            className={cx(
              "type-label-caps mb-2 text-foreground-muted transition-opacity",
              "motion-safe:duration-(--duration-standard)",
              showGroups ? "opacity-100" : "opacity-0",
            )}
            aria-hidden={!showGroups}
          >
            {group.label}
          </p>
          <ul className="flex flex-col gap-2">
            {DEMO_NODES.filter((node) => node.groupId === group.id).map((node) => {
              const revealed = revealedNodeIds === undefined || revealedNodeIds.has(node.id);
              const highlighted = highlightedNodeId === node.id;
              return (
                <li
                  key={node.id}
                  className={cx(
                    "border bg-surface px-2 py-1.5 transition-colors",
                    "motion-safe:duration-(--duration-fast)",
                    !revealed && "border-dashed border-border opacity-40",
                    revealed && !highlighted && "border-border-strong",
                    highlighted && "border-2 border-accent bg-accent-muted",
                  )}
                >
                  <span className="type-mono-data block text-foreground">
                    {highlighted && <span aria-hidden>▸ </span>}
                    {node.name}
                    {highlighted && <span className="sr-only"> (selected)</span>}
                    {!revealed && <span className="sr-only"> (pending)</span>}
                  </span>
                  <span className="type-label-caps text-foreground-muted">{node.category}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
