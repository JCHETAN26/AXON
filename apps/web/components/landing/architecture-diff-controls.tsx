"use client";

import { cx } from "@axon/ui";
import { useRef, type KeyboardEvent } from "react";

export type EvolutionView = "current" | "recommended" | "diff";

export const EVOLUTION_VIEWS: readonly { id: EvolutionView; label: string }[] = [
  { id: "current", label: "Current" },
  { id: "recommended", label: "Recommended" },
  { id: "diff", label: "Diff" },
];

export function evolutionTabId(view: EvolutionView): string {
  return `evolution-tab-${view}`;
}

export interface ArchitectureDiffControlsProps {
  view: EvolutionView;
  onViewChange: (view: EvolutionView) => void;
}

/** Horizontal tablist switching between the three architecture views. */
export function ArchitectureDiffControls({ view, onViewChange }: ArchitectureDiffControlsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectIndex = (index: number) => {
    const target = EVOLUTION_VIEWS[index];
    if (target !== undefined) {
      onViewChange(target.id);
      tabRefs.current[index]?.focus();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = EVOLUTION_VIEWS.findIndex((candidate) => candidate.id === view);
    const lastIndex = EVOLUTION_VIEWS.length - 1;
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        selectIndex(currentIndex >= lastIndex ? 0 : currentIndex + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        selectIndex(currentIndex <= 0 ? lastIndex : currentIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        selectIndex(0);
        break;
      case "End":
        event.preventDefault();
        selectIndex(lastIndex);
        break;
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Architecture views"
      className="inline-flex border-2 border-border-strong bg-surface p-1"
    >
      {EVOLUTION_VIEWS.map((candidate, index) => {
        const selected = candidate.id === view;
        return (
          <button
            key={candidate.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={evolutionTabId(candidate.id)}
            aria-selected={selected}
            aria-controls="evolution-panel"
            tabIndex={selected ? 0 : -1}
            onClick={() => {
              onViewChange(candidate.id);
            }}
            onKeyDown={onKeyDown}
            className={cx(
              "type-label-caps px-4 py-2 transition-colors",
              "motion-safe:duration-(--duration-fast) motion-reduce:transition-none",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-foreground-muted hover:text-foreground",
            )}
          >
            {candidate.label}
          </button>
        );
      })}
    </div>
  );
}
