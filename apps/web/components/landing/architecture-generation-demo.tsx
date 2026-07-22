"use client";

import { Button, cx } from "@axon/ui";
import { useEffect, useState } from "react";

import { ArchitectureMiniMap } from "./architecture-mini-map";
import {
  DEMO_EDGES,
  DEMO_GROUPS,
  GENERATION_ORDER,
  GENERATION_STAGES,
  type NodeId,
} from "@/data/demo-architecture";

export const GENERATION_TICK_MS = 220;

const PARSE_TICKS = 3;
const GROUP_TICKS = 3;
const VALIDATE_TICKS = 3;

export const TOTAL_GENERATION_TICKS =
  PARSE_TICKS + GENERATION_ORDER.length + GROUP_TICKS + VALIDATE_TICKS;

export interface GenerationView {
  /** Index into GENERATION_STAGES. */
  stageIndex: number;
  revealedCount: number;
  done: boolean;
}

/** Pure mapping from elapsed ticks to what the demo shows. */
export function deriveGenerationView(tick: number): GenerationView {
  if (tick >= TOTAL_GENERATION_TICKS) {
    return {
      stageIndex: GENERATION_STAGES.length - 1,
      revealedCount: GENERATION_ORDER.length,
      done: true,
    };
  }
  if (tick < PARSE_TICKS) {
    return { stageIndex: 0, revealedCount: 0, done: false };
  }
  const afterParse = tick - PARSE_TICKS;
  if (afterParse < GENERATION_ORDER.length) {
    return { stageIndex: 1, revealedCount: afterParse + 1, done: false };
  }
  const afterNodes = afterParse - GENERATION_ORDER.length;
  if (afterNodes < GROUP_TICKS) {
    return { stageIndex: 2, revealedCount: GENERATION_ORDER.length, done: false };
  }
  return { stageIndex: 3, revealedCount: GENERATION_ORDER.length, done: false };
}

type StageState = "pending" | "active" | "done";

function stageState(index: number, view: GenerationView): StageState {
  if (view.done || index < view.stageIndex) {
    return "done";
  }
  return index === view.stageIndex ? "active" : "pending";
}

const STAGE_GLYPH: Record<StageState, string> = {
  done: "✓",
  active: "▸",
  pending: "○",
};

export function ArchitectureGenerationDemo() {
  // The final generated state is fully visible by default; Replay walks
  // through the stages again.
  const [tick, setTick] = useState(TOTAL_GENERATION_TICKS);
  const playing = tick < TOTAL_GENERATION_TICKS;
  const view = deriveGenerationView(tick);

  useEffect(() => {
    if (!playing) {
      return;
    }
    const interval = setInterval(() => {
      setTick((current) => Math.min(current + 1, TOTAL_GENERATION_TICKS));
    }, GENERATION_TICK_MS);
    return () => {
      clearInterval(interval);
    };
  }, [playing]);

  const replay = () => {
    // With reduced motion, show the staged result immediately instead of
    // walking through timed stages.
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTick(reducedMotion ? TOTAL_GENERATION_TICKS : 0);
  };

  const activeStage = GENERATION_STAGES[view.stageIndex];
  const statusText = view.done
    ? `ARCHITECTURE_COMPLETE · ${GENERATION_ORDER.length} services · ${DEMO_EDGES.length} connections · ${DEMO_GROUPS.length} groups`
    : `GENERATING · ${activeStage?.label ?? ""} · ${view.revealedCount}/${GENERATION_ORDER.length} services`;

  const revealedIds: ReadonlySet<NodeId> = new Set(GENERATION_ORDER.slice(0, view.revealedCount));

  return (
    <div className="border-2 border-border-strong bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
        <p className="type-mono-data text-foreground-muted">GENERATION_PREVIEW</p>
        <Button variant="technical" size="sm" onClick={replay} disabled={playing}>
          Replay Generation
        </Button>
      </div>
      <ol
        aria-label="Generation stages"
        className="flex flex-col gap-1.5 border-b border-border p-4"
      >
        {GENERATION_STAGES.map((stage, index) => {
          const state = stageState(index, view);
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
      <div className="bg-canvas-grid p-4">
        <ArchitectureMiniMap revealedNodeIds={revealedIds} showGroups={view.stageIndex >= 2} />
      </div>
      <p
        role="status"
        aria-live="polite"
        aria-label="Generation status"
        className="type-mono-data border-t border-border p-3 text-foreground-muted"
      >
        {statusText}
      </p>
    </div>
  );
}
