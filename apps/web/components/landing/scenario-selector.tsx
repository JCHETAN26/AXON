import { cx } from "@axon/ui";

import { SIMULATION_SCENARIOS } from "@/data/simulation";

export interface ScenarioSelectorProps {
  activeScenarioId: string | null;
  onSelect: (rps: number) => void;
}

export function ScenarioSelector({ activeScenarioId, onSelect }: ScenarioSelectorProps) {
  return (
    <div>
      <p className="type-label-caps text-foreground-muted">Scenario presets</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SIMULATION_SCENARIOS.map((scenario) => {
          const active = scenario.id === activeScenarioId;
          return (
            <button
              key={scenario.id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                onSelect(scenario.rps);
              }}
              className={cx(
                "border-2 px-3 py-2 text-left transition-colors",
                "motion-safe:duration-(--duration-fast) motion-reduce:transition-none",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                active
                  ? "border-accent bg-accent-muted"
                  : "border-border bg-surface hover:border-border-strong",
              )}
            >
              <span className="type-label-caps block text-foreground">{scenario.label}</span>
              <span className="type-mono-data text-foreground-muted">{scenario.note}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
