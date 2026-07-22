import { MONITORING_TIMELINE } from "@/data/monitoring";

export interface MonitoringTimeControlProps {
  stepIndex: number;
  onChange: (stepIndex: number) => void;
}

/** Scrubs through the monitoring timeline snapshots. */
export function MonitoringTimeControl({ stepIndex, onChange }: MonitoringTimeControlProps) {
  const step = MONITORING_TIMELINE[stepIndex];
  return (
    <div className="min-w-64 flex-1">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="monitoring-time" className="type-label-caps text-foreground-muted">
          Timeline
        </label>
        <output htmlFor="monitoring-time" className="type-mono-data text-accent">
          {step?.label ?? ""}
        </output>
      </div>
      <input
        id="monitoring-time"
        type="range"
        min={0}
        max={MONITORING_TIMELINE.length - 1}
        step={1}
        value={stepIndex}
        aria-valuetext={step?.label ?? ""}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none border border-border-strong bg-surface-subtle accent-(--color-accent) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      />
      <div aria-hidden className="type-mono-data mt-1.5 flex justify-between text-foreground-muted">
        {MONITORING_TIMELINE.map((tick) => (
          <span key={tick.id}>{tick.shortLabel}</span>
        ))}
      </div>
    </div>
  );
}
