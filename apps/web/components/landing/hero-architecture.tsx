"use client";

import { ArchitectureNode, Button, CanvasToolbar } from "@axon/ui";
import { useCallback, useEffect, useRef, useState } from "react";

import { ArchitectureEdge, ArrowMarkerDefs } from "./architecture-edge";
import { ArchitectureGroup } from "./architecture-group";
import { ArchitectureLegend } from "./architecture-legend";
import { ArchitectureMobileFlow } from "./architecture-mobile-flow";
import { AuditFindingMarker } from "./audit-finding-marker";
import {
  DEMO_EDGES,
  DEMO_FINDINGS,
  DEMO_GROUPS,
  DEMO_NODES,
  SELECTED_NODE_ID,
  type DemoNode,
} from "@/data/demo-architecture";

type AuditStatus = "idle" | "running" | "complete";

export const AUDIT_REVEAL_INTERVAL_MS = 450;

interface NodeRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  cx: number;
  cy: number;
}

/** Gap in px between an arrowhead and the node border it points at. */
const ARROW_GAP = 4;

function edgePath(source: NodeRect, target: NodeRect): string {
  const dx = target.cx - source.cx;
  const dy = target.cy - source.cy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const sx = dx >= 0 ? source.right : source.left;
    const tx = dx >= 0 ? target.left - ARROW_GAP : target.right + ARROW_GAP;
    const mid = (sx + tx) / 2;
    return `M ${sx} ${source.cy} C ${mid} ${source.cy}, ${mid} ${target.cy}, ${tx} ${target.cy}`;
  }
  const sy = dy >= 0 ? source.bottom : source.top;
  const ty = dy >= 0 ? target.top - ARROW_GAP : target.bottom + ARROW_GAP;
  const mid = (sy + ty) / 2;
  return `M ${source.cx} ${sy} C ${source.cx} ${mid}, ${target.cx} ${mid}, ${target.cx} ${ty}`;
}

function nodesInGroup(groupId: string): DemoNode[] {
  return DEMO_NODES.filter((node) => node.groupId === groupId);
}

const RISK_COUNT = DEMO_FINDINGS.filter((finding) => finding.severity !== "healthy").length;
const VERIFIED_COUNT = DEMO_FINDINGS.length - RISK_COUNT;

export function HeroArchitecture() {
  const [status, setStatus] = useState<AuditStatus>("idle");
  const [revealedCount, setRevealedCount] = useState(0);
  const revealedFindings = DEMO_FINDINGS.slice(0, revealedCount);
  const findingByNode = new Map(revealedFindings.map((finding) => [finding.nodeId, finding]));

  // Progressive reveal while the audit is running.
  useEffect(() => {
    if (status !== "running") {
      return;
    }
    const interval = setInterval(() => {
      setRevealedCount((count) => Math.min(count + 1, DEMO_FINDINGS.length));
    }, AUDIT_REVEAL_INTERVAL_MS);
    return () => {
      clearInterval(interval);
    };
  }, [status]);

  useEffect(() => {
    if (status === "running" && revealedCount >= DEMO_FINDINGS.length) {
      setStatus("complete");
    }
  }, [status, revealedCount]);

  const runAudit = () => {
    setRevealedCount(0);
    setStatus("running");
  };

  const resetAudit = () => {
    setRevealedCount(0);
    setStatus("idle");
  };

  // Edge geometry is measured from the rendered nodes so the SVG overlay
  // follows the responsive grid instead of absolute pixel positions.
  const canvasRef = useRef<HTMLDivElement>(null);
  const [edgePaths, setEdgePaths] = useState<Record<string, string>>({});

  const measure = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const canvasBox = canvas.getBoundingClientRect();
    if (canvasBox.width === 0) {
      setEdgePaths({});
      return;
    }
    const rects = new Map<string, NodeRect>();
    for (const element of canvas.querySelectorAll<HTMLElement>("[data-node-id]")) {
      const box = element.getBoundingClientRect();
      rects.set(element.dataset["nodeId"] ?? "", {
        left: box.left - canvasBox.left,
        right: box.right - canvasBox.left,
        top: box.top - canvasBox.top,
        bottom: box.bottom - canvasBox.top,
        cx: box.left - canvasBox.left + box.width / 2,
        cy: box.top - canvasBox.top + box.height / 2,
      });
    }
    const next: Record<string, string> = {};
    for (const edge of DEMO_EDGES) {
      const source = rects.get(edge.source);
      const target = rects.get(edge.target);
      if (source !== undefined && target !== undefined) {
        next[edge.id] = edgePath(source, target);
      }
    }
    setEdgePaths(next);
  }, []);

  useEffect(() => {
    measure();
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(canvas);
    let cancelled = false;
    // Font loading shifts node sizes; re-measure once fonts settle.
    void document.fonts?.ready.then(() => {
      if (!cancelled) {
        measure();
      }
    });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [measure]);

  const statusText =
    status === "idle"
      ? `AUDIT_IDLE · ${DEMO_NODES.length} services · ${DEMO_EDGES.length} connections`
      : status === "running"
        ? `AUDIT_RUNNING · ${revealedCount}/${DEMO_FINDINGS.length} findings`
        : `AUDIT_COMPLETE · ${RISK_COUNT} risks found · ${VERIFIED_COUNT} verified`;

  return (
    <figure aria-label="Interactive architecture demonstration" className="m-0">
      <div
        id="demo"
        className="scroll-mt-20 border-2 border-border-strong bg-surface shadow-[16px_16px_0_0_var(--color-accent-muted)]"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
          <CanvasToolbar label="Audit controls">
            <Button
              variant="technical"
              size="sm"
              onClick={runAudit}
              disabled={status === "running"}
            >
              Run Audit
            </Button>
            <Button variant="technical" size="sm" onClick={resetAudit} disabled={status === "idle"}>
              Reset
            </Button>
          </CanvasToolbar>
          <p
            role="status"
            aria-live="polite"
            aria-label="Audit status"
            className="type-mono-data text-foreground-muted"
          >
            {statusText}
          </p>
        </div>

        {/* Full topology: tablet and up. */}
        <div ref={canvasRef} className="bg-canvas-grid relative hidden p-6 md:block">
          <svg aria-hidden className="pointer-events-none absolute inset-0 z-10 h-full w-full">
            <ArrowMarkerDefs />
            {DEMO_EDGES.map((edge) => {
              const d = edgePaths[edge.id];
              return d === undefined ? null : <ArchitectureEdge key={edge.id} edge={edge} d={d} />;
            })}
          </svg>
          <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
            {DEMO_GROUPS.map((group) => (
              <ArchitectureGroup key={group.id} label={group.label}>
                {nodesInGroup(group.id).map((node) => {
                  const finding = findingByNode.get(node.id);
                  const isCriticalFinding =
                    finding !== undefined &&
                    (finding.severity === "critical" || finding.severity === "high");
                  return (
                    <div key={node.id} data-node-id={node.id} className="relative z-20">
                      <ArchitectureNode
                        category={node.category}
                        name={node.name}
                        meta={node.metrics}
                        state={
                          isCriticalFinding
                            ? "critical"
                            : node.id === SELECTED_NODE_ID
                              ? "selected"
                              : "default"
                        }
                      />
                      {finding !== undefined && <AuditFindingMarker finding={finding} />}
                    </div>
                  );
                })}
              </ArchitectureGroup>
            ))}
          </div>
          <ArchitectureLegend className="mt-6" />
        </div>

        {/* Focused flow: small viewports. */}
        <ArchitectureMobileFlow
          revealedFindings={revealedFindings}
          auditStarted={status !== "idle"}
        />

        {/* Structured textual form of the diagram for screen readers. */}
        <div className="sr-only">
          <p>
            Architecture overview:{" "}
            {DEMO_GROUPS.map(
              (group) =>
                `${group.label}: ${nodesInGroup(group.id)
                  .map((node) => node.name)
                  .join(", ")}`,
            ).join(". ")}
            . The highlighted request path flows from cloudflare to api-gateway to app-service,
            which reads redis-cluster and postgresql. app-service publishes events to rabbitmq,
            consumed by worker-pool writing to object-storage. payments-service calls stripe.
            app-service and postgresql send telemetry to datadog.
          </p>
        </div>
      </div>
      <figcaption className="type-mono-data mt-3 text-foreground-muted">
        Interactive demonstration of a sample architecture — findings and metrics are illustrative.
      </figcaption>
    </figure>
  );
}
