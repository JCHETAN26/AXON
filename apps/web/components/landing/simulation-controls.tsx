import { type ChangeEvent } from "react";

import {
  MAX_CACHE_HIT_PCT,
  MAX_WORKERS,
  MIN_CACHE_HIT_PCT,
  MIN_WORKERS,
  SIMULATION_MAX_RPS,
  SIMULATION_MIN_RPS,
  formatRps,
  type SimulationAssumptions,
} from "@/data/simulation";

const RANGE_CLASSES =
  "mt-3 h-1.5 w-full cursor-pointer appearance-none border border-border-strong bg-surface-subtle accent-(--color-accent) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

function RangeField({
  id,
  label,
  min,
  max,
  step,
  value,
  display,
  valueText,
  onChange,
}: {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  valueText: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="type-label-caps text-foreground-muted">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-lg font-medium text-accent">
          {display}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          onChange(Number(event.target.value));
        }}
        className={RANGE_CLASSES}
      />
    </div>
  );
}

export interface SimulationControlsProps {
  rps: number;
  assumptions: SimulationAssumptions;
  onRpsChange: (rps: number) => void;
  onAssumptionsChange: (assumptions: SimulationAssumptions) => void;
}

export function SimulationControls({
  rps,
  assumptions,
  onRpsChange,
  onAssumptionsChange,
}: SimulationControlsProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <RangeField
          id="simulation-rps"
          label="Requests per second"
          min={SIMULATION_MIN_RPS}
          max={SIMULATION_MAX_RPS}
          step={100}
          value={rps}
          display={formatRps(rps)}
          valueText={`${formatRps(rps)} requests per second`}
          onChange={onRpsChange}
        />
        <div className="type-mono-data mt-2 flex justify-between text-foreground-muted">
          <span>{formatRps(SIMULATION_MIN_RPS)}</span>
          <span>{formatRps(SIMULATION_MAX_RPS)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-5 border-t border-border pt-5">
        <p className="type-label-caps text-foreground-muted">Infrastructure assumptions</p>
        <RangeField
          id="simulation-cache-hit"
          label="Cache-hit rate"
          min={MIN_CACHE_HIT_PCT}
          max={MAX_CACHE_HIT_PCT}
          step={0.1}
          value={assumptions.cacheHitPct}
          display={`${assumptions.cacheHitPct.toFixed(1)}%`}
          valueText={`${assumptions.cacheHitPct.toFixed(1)} percent cache-hit rate`}
          onChange={(cacheHitPct) => {
            onAssumptionsChange({ ...assumptions, cacheHitPct });
          }}
        />
        <RangeField
          id="simulation-workers"
          label="Worker pool size"
          min={MIN_WORKERS}
          max={MAX_WORKERS}
          step={1}
          value={assumptions.workers}
          display={`×${assumptions.workers}`}
          valueText={`${assumptions.workers} workers`}
          onChange={(workers) => {
            onAssumptionsChange({ ...assumptions, workers });
          }}
        />
        <label
          htmlFor="simulation-stripe-outage"
          className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1"
        >
          <input
            id="simulation-stripe-outage"
            type="checkbox"
            checked={assumptions.stripeOutage}
            onChange={(event) => {
              onAssumptionsChange({ ...assumptions, stripeOutage: event.target.checked });
            }}
            className="size-4 shrink-0 rounded-control border border-border-strong accent-(--color-accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          />
          <span className="type-label-caps text-foreground">Stripe outage</span>
          <span className="type-mono-data w-full pl-7 text-foreground-muted">
            payment provider unreachable
          </span>
        </label>
      </div>
    </div>
  );
}
