"use client";

import { Button, CanvasToolbar, TerminalBlock, cx } from "@axon/ui";
import { useEffect, useState } from "react";

import { DEMO_EDGES, DEMO_NODES } from "@/data/demo-architecture";
import {
  DISCOVERED_FILES,
  MCP_PIPELINE,
  MCP_REDACTIONS,
  MCP_SCAN_STAGES,
} from "@/data/mcp-workflow";

export const SCAN_TICK_MS = 260;
const TICKS_PER_STAGE = 2;
/** Stages that run automatically before the explicit approval gate. */
const AUTO_STAGES = 5;
const AUTO_SCAN_TICKS = AUTO_STAGES * TICKS_PER_STAGE;
const SYNC_TICKS = 2;

type ScanPhase = "idle" | "scanning" | "awaiting-approval" | "syncing" | "complete";

type StageState = "pending" | "active" | "done";

function stageStates(phase: ScanPhase, tick: number): StageState[] {
  return MCP_SCAN_STAGES.map((_, index) => {
    switch (phase) {
      case "idle":
        return "pending";
      case "scanning": {
        const activeIndex = Math.min(AUTO_STAGES - 1, Math.floor(tick / TICKS_PER_STAGE));
        return index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
      }
      case "awaiting-approval":
        return index < AUTO_STAGES ? "done" : index === AUTO_STAGES ? "active" : "pending";
      case "syncing":
        return index <= AUTO_STAGES ? "done" : "active";
      case "complete":
        return "done";
    }
  });
}

const STAGE_GLYPH: Record<StageState, string> = {
  done: "✓",
  active: "▸",
  pending: "○",
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scanLogLines(states: StageState[], phase: ScanPhase): string[] {
  const doneCount = states.filter((state, index) => index < AUTO_STAGES && state === "done").length;
  const lines: string[] = [];
  if (doneCount >= 1) {
    lines.push("repository access granted · read-only");
  }
  if (doneCount >= 2) {
    lines.push(...DISCOVERED_FILES.map((file) => `+ ${file}`));
  }
  if (doneCount >= 3) {
    lines.push(`parsed ${DISCOVERED_FILES.length} sources → ${DEMO_NODES.length} services`);
  }
  if (doneCount >= 4) {
    lines.push(
      ...MCP_REDACTIONS.map((redaction) => `${redaction.source} → ${redaction.replacement}`),
    );
  }
  if (doneCount >= 5) {
    lines.push("architecture.json generated (sanitized)");
  }
  if (phase === "awaiting-approval") {
    lines.push("awaiting user approval — nothing uploaded");
  }
  if (phase === "syncing") {
    lines.push("sync approved — uploading sanitized model");
  }
  if (phase === "complete") {
    lines.push(`studio received ${DEMO_NODES.length} services · ${DEMO_EDGES.length} connections`);
  }
  return lines;
}

function pipelineStepState(stepId: string, states: StageState[]): StageState {
  const stageIndexes = MCP_SCAN_STAGES.flatMap((stage, index) =>
    stage.pipelineStepId === stepId ? [index] : [],
  );
  if (stageIndexes.some((index) => states[index] === "active")) {
    return "active";
  }
  if (stageIndexes.length > 0 && stageIndexes.every((index) => states[index] === "done")) {
    return "done";
  }
  return "pending";
}

function PipelineStep({ label, state }: { label: string; state: StageState }) {
  return (
    <span
      className={cx(
        "type-mono-data border px-2 py-1.5 transition-colors motion-safe:duration-(--duration-fast)",
        state === "active" && "border-accent bg-accent-muted text-foreground",
        state === "done" && "border-border-strong bg-surface text-foreground",
        state === "pending" && "border-border bg-surface text-foreground-muted",
      )}
    >
      <span aria-hidden>{STAGE_GLYPH[state]} </span>
      {label}
    </span>
  );
}

export function McpDataFlow() {
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (phase !== "scanning" && phase !== "syncing") {
      return;
    }
    const interval = setInterval(() => {
      setTick((current) => current + 1);
    }, SCAN_TICK_MS);
    return () => {
      clearInterval(interval);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "scanning" && tick >= AUTO_SCAN_TICKS) {
      setPhase("awaiting-approval");
    }
    if (phase === "syncing" && tick >= SYNC_TICKS) {
      setPhase("complete");
    }
  }, [phase, tick]);

  const runScan = () => {
    setTick(prefersReducedMotion() ? AUTO_SCAN_TICKS : 0);
    setPhase(prefersReducedMotion() ? "awaiting-approval" : "scanning");
  };

  const approveSync = () => {
    setTick(prefersReducedMotion() ? SYNC_TICKS : 0);
    setPhase(prefersReducedMotion() ? "complete" : "syncing");
  };

  const reset = () => {
    setTick(0);
    setPhase("idle");
  };

  const states = stageStates(phase, tick);
  const logLines = scanLogLines(states, phase);

  const statusText =
    phase === "idle"
      ? "SCAN_IDLE · local preview — no repository is accessed"
      : phase === "scanning"
        ? `SCANNING · ${MCP_SCAN_STAGES[Math.min(AUTO_STAGES - 1, Math.floor(tick / TICKS_PER_STAGE))]?.label ?? ""}`
        : phase === "awaiting-approval"
          ? "AWAITING_APPROVAL · nothing has been uploaded"
          : phase === "syncing"
            ? "SYNCING · uploading sanitized model"
            : `SYNC_COMPLETE · ${DEMO_NODES.length} services in the web studio`;

  const localSteps = MCP_PIPELINE.filter((step) => step.boundary === "local");
  const cloudSteps = MCP_PIPELINE.filter((step) => step.boundary === "cloud");

  return (
    <div className="border-2 border-border-strong bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
        <p className="type-mono-data text-foreground-muted">
          WORKFLOW_PREVIEW · no real repository is scanned
        </p>
        <CanvasToolbar label="Scan controls">
          <Button
            variant="technical"
            size="sm"
            onClick={runScan}
            disabled={phase !== "idle" && phase !== "complete"}
          >
            Run Local Scan
          </Button>
          <Button variant="technical" size="sm" onClick={reset} disabled={phase === "idle"}>
            Reset
          </Button>
        </CanvasToolbar>
      </div>

      <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-stretch">
        <div className="flex flex-1 flex-col gap-2 border border-dashed border-border-strong p-3">
          <p className="type-label-caps text-foreground-muted">Local machine</p>
          <div className="flex flex-wrap items-center gap-2">
            {localSteps.map((step, index) => (
              <span key={step.id} className="flex items-center gap-2">
                {index > 0 && (
                  <span aria-hidden className="text-foreground-muted">
                    →
                  </span>
                )}
                <PipelineStep label={step.label} state={pipelineStepState(step.id, states)} />
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 self-center xl:flex-col xl:justify-center">
          <span className="type-label-caps text-accent">User-approved sync</span>
          <span aria-hidden className="text-foreground-muted">
            →
          </span>
        </div>
        <div className="flex flex-col gap-2 border border-dashed border-accent p-3">
          <p className="type-label-caps text-foreground-muted">AXON cloud</p>
          <div className="flex flex-wrap items-center gap-2">
            {cloudSteps.map((step) => (
              <PipelineStep
                key={step.id}
                label={step.label}
                state={pipelineStepState(step.id, states)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-b border-border p-4 lg:grid-cols-2">
        <ol aria-label="Scan stages" className="flex flex-col gap-1.5">
          {MCP_SCAN_STAGES.map((stage, index) => {
            const state = states[index] ?? "pending";
            return (
              <li
                key={stage.id}
                className={cx(
                  "type-mono-data flex items-center gap-2",
                  state === "active" && "text-accent",
                  state === "done" && "text-foreground",
                  state === "pending" && "text-foreground-muted",
                )}
              >
                <span aria-hidden>{STAGE_GLYPH[state]}</span>
                {stage.label}
                <span className="sr-only">
                  {state === "done"
                    ? " (complete)"
                    : state === "active"
                      ? " (in progress)"
                      : " (pending)"}
                </span>
              </li>
            );
          })}
        </ol>
        <TerminalBlock
          title="scan.log"
          prompt=""
          lines={logLines.length > 0 ? logLines : ["run a local scan to populate the log"]}
        />
      </div>

      {phase === "awaiting-approval" && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-accent-muted p-4">
          <p className="type-body-md text-foreground">
            Nothing has been uploaded. Review the sanitized model, then approve synchronization.
          </p>
          <Button variant="primary" size="sm" onClick={approveSync}>
            Approve Sync
          </Button>
        </div>
      )}

      <p
        role="status"
        aria-live="polite"
        aria-label="Scan status"
        className="type-mono-data p-3 text-foreground-muted"
      >
        {statusText}
      </p>
    </div>
  );
}
