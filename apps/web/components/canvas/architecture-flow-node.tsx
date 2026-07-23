"use client";

import { ArchitectureNode, StatusBadge } from "@axon/ui";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import { useAuditOverlayEntry } from "./audit-overlay-context";
import { useDiffOverlayState } from "./diff-overlay-context";
import { useCostOverlayEntry } from "./cost-overlay-context";
import { useSimulationOverlayEntry } from "./simulation-overlay-context";
import { ArchitectureServiceIcon } from "./architecture-service-icon";
import { SEVERITY_STATUS_KIND } from "@/lib/audit/run-project-audit";
import { type CanvasNode } from "@/lib/canvas/adapters";
import {
  findArchitectureIconById,
  resolveArchitectureIcon,
} from "@/lib/icons/architecture-icon-registry";
import { STATUS_KIND, STATUS_LABEL } from "@/lib/simulation/simulation-view";

const HANDLE_CLASSES =
  "!size-2.5 !rounded-full !border-2 !border-border-strong !bg-surface hover:!border-accent";

/**
 * React Flow rendering of the canonical ArchitectureNode primitive with
 * left/right connection handles. Selection maps to the primitive's
 * "selected" treatment; planned nodes keep the dashed treatment. Audit
 * findings and simulation estimates render as read-only badges sourced from
 * context, never from node state, so they cannot dirty the document.
 */
export function ArchitectureFlowNode({ id, data, selected }: NodeProps<CanvasNode>) {
  const overlay = useAuditOverlayEntry(id);
  const simulation = useSimulationOverlayEntry(id);
  const cost = useCostOverlayEntry(id);
  const diff = useDiffOverlayState(id);
  const icon =
    findArchitectureIconById(data.iconId) ??
    resolveArchitectureIcon({
      category: data.category,
      name: data.name,
      ...(data.meta !== undefined && { meta: data.meta }),
    });

  return (
    <div className="relative">
      <Handle type="target" position={Position.Left} className={HANDLE_CLASSES} />
      {diff !== undefined && diff !== "unchanged" && (
        <StatusBadge
          kind={diff === "added" ? "success" : diff === "removed" ? "critical" : "info"}
          className="absolute -top-3.5 left-2 z-10 bg-surface"
        >
          {diff}
        </StatusBadge>
      )}
      {overlay !== undefined && (
        <StatusBadge
          kind={SEVERITY_STATUS_KIND[overlay.severity]}
          className="absolute -top-3.5 right-2 z-10 bg-surface"
        >
          {overlay.severity} · {overlay.openCount}
          <span className="sr-only"> open audit finding{overlay.openCount === 1 ? "" : "s"}</span>
        </StatusBadge>
      )}
      <ArchitectureNode
        className="w-56"
        name={data.name}
        category={data.category}
        icon={<ArchitectureServiceIcon icon={icon} />}
        {...(data.meta !== undefined && { meta: data.meta })}
        state={
          selected === true
            ? "selected"
            : diff === "added" || diff === "modified"
              ? "recommended"
              : data.planned === true
                ? "planned"
                : "default"
        }
      />
      {simulation !== undefined && (
        <StatusBadge
          kind={STATUS_KIND[simulation.status]}
          className="absolute -bottom-3.5 left-2 z-10 bg-surface"
        >
          {(simulation.utilization * 100).toFixed(0)}%
          <span className="sr-only">
            {" "}
            estimated utilization — {STATUS_LABEL[simulation.status]}
          </span>
        </StatusBadge>
      )}
      {cost !== undefined && (
        <StatusBadge kind="info" className="absolute -bottom-3.5 right-2 z-10 bg-surface">
          ${cost.expectedMonthly.toFixed(0)}
          <span className="sr-only">
            {" "}
            modeled monthly cost driver, {cost.confidence} confidence, catalog{" "}
            {cost.pricingCatalogVersion}
          </span>
        </StatusBadge>
      )}
      <Handle type="source" position={Position.Right} className={HANDLE_CLASSES} />
    </div>
  );
}
