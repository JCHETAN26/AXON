"use client";

import {
  CAPACITY_FIELDS_BY_KIND,
  type CapacityField,
  type ComponentCapacityOverride,
  type ComponentResult,
} from "@axon/architecture-simulation";
import { Button, cx } from "@axon/ui";
import { useEffect, useState } from "react";

interface FieldMeta {
  readonly label: string;
  readonly hint: string;
  readonly step: number;
  readonly max?: number;
}

const FIELD_META: Record<CapacityField, FieldMeta> = {
  units: { label: "Units", hint: "replicas, instances, or workers", step: 1 },
  requestsPerSecondPerUnit: {
    label: "Capacity per unit (rps)",
    hint: "requests/sec one unit serves",
    step: 10,
  },
  cacheHitPercent: {
    label: "Cache hit rate (%)",
    hint: "share served without touching downstream",
    step: 0.1,
    max: 100,
  },
  maxConnections: { label: "Connection limit", hint: "concurrent connection ceiling", step: 1 },
  connectionsPerRequest: {
    label: "Connections per rps",
    hint: "connections held per request/sec",
    step: 0.01,
  },
};

export interface AssumptionControlsProps {
  component: ComponentResult;
  /** The user override currently stored for this component, if any. */
  override: ComponentCapacityOverride | undefined;
  /** Persists the edited override, replacing this component's entry. */
  onSave: (nodeId: string, override: ComponentCapacityOverride) => void;
}

/**
 * Editable capacity assumptions for one component. Only the fields the
 * component's kind actually models are shown; a blank field falls back to the
 * architecture-provided value or an AXON default, so clearing a field is how a
 * user *removes* an override rather than forcing a zero.
 */
export function AssumptionControls({ component, override, onSave }: AssumptionControlsProps) {
  const fields = CAPACITY_FIELDS_BY_KIND[component.kind];

  const initial = (): Record<string, string> => {
    const draft: Record<string, string> = {};
    for (const field of fields) {
      const value = override?.[field];
      draft[field] = value === undefined ? "" : String(value);
    }
    return draft;
  };

  const [draft, setDraft] = useState<Record<string, string>>(initial);

  // Reset the form when the selection changes.
  useEffect(() => {
    setDraft(initial());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [component.nodeId, override]);

  if (fields.length === 0) {
    return (
      <p className="type-body-md text-foreground-muted">
        This component has no capacity model, so there are no assumptions to edit.
      </p>
    );
  }

  const save = () => {
    const next: Record<string, number> = {};
    for (const field of fields) {
      const raw = draft[field]?.trim() ?? "";
      if (raw === "") continue;
      const value = Number(raw);
      if (Number.isFinite(value) && value > 0) {
        next[field] = value;
      }
    }
    onSave(component.nodeId, next as ComponentCapacityOverride);
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      {fields.map((field) => {
        const meta = FIELD_META[field];
        const inputId = `assumption-${component.nodeId}-${field}`;
        return (
          <div key={field} className="flex flex-col gap-1">
            <label htmlFor={inputId} className="type-label-caps text-foreground-muted">
              {meta.label}
            </label>
            <input
              id={inputId}
              type="number"
              inputMode="decimal"
              min={0}
              step={meta.step}
              {...(meta.max !== undefined && { max: meta.max })}
              value={draft[field] ?? ""}
              placeholder="default"
              onChange={(event) => {
                setDraft((current) => ({ ...current, [field]: event.target.value }));
              }}
              className={cx(
                "type-mono-data rounded-control border-2 border-border bg-surface px-2.5 py-1.5",
                "focus-visible:border-accent focus-visible:outline-none",
              )}
            />
            <span className="type-mono-data text-foreground-muted">{meta.hint}</span>
          </div>
        );
      })}
      <Button type="submit" variant="secondary" size="sm" className="self-start">
        Save assumptions
      </Button>
      <p className="type-mono-data text-foreground-muted">
        Leave a field blank to use the architecture value or an AXON default. Saving reruns the
        simulation.
      </p>
    </form>
  );
}
