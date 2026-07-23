"use client";

import {
  estimateArchitectureCost,
  scaleUsageProfileByFactor,
  type UsageProfile,
} from "@axon/architecture-cost";
import {
  BASELINE_SCENARIO,
  SCENARIO_PRESETS,
  withCapacityProfile,
  SIMULATION_DISCLAIMER,
  SIMULATION_MODEL_VERSION,
  compareSimulations,
  runSimulation,
  type CapacityProfile,
  type ComponentCapacityOverride,
  type ProjectSimulationState,
  type Scenario,
  type SimulationProfile,
} from "@axon/architecture-simulation";
import { type ArchitectureDocument } from "@axon/diagram-schema";
import { Button, StatusBadge, cx } from "@axon/ui";
import { useMemo, useState } from "react";

import { AssumptionControls } from "./assumption-controls";
import { ComponentResultInspector } from "./component-result-inspector";
import { defaultUsageFor } from "@/lib/cost/default-usage";
import { getSimulationRepository } from "@/lib/simulation/get-simulation-repository";
import {
  STATUS_KIND,
  STATUS_LABEL,
  buildSimulationState,
  initialProfile,
  formatRps,
  getSimulationFreshness,
  type SimulationFreshness,
} from "@/lib/simulation/simulation-view";

const FRESHNESS_TEXT: Record<SimulationFreshness, string> = {
  "never-run": `NOT_RUN · model v${SIMULATION_MODEL_VERSION}`,
  "up-to-date": `UP_TO_DATE · model v${SIMULATION_MODEL_VERSION}`,
  "architecture-changed": "ARCHITECTURE_CHANGED · rerun to refresh the estimate",
  "model-updated": "MODEL_UPDATED · rerun to refresh the estimate",
  "assumptions-changed": "ASSUMPTIONS_CHANGED · rerun to refresh the estimate",
};

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export interface SimulationWorkspaceProps {
  document: ArchitectureDocument;
  simulationState: ProjectSimulationState | null;
  onSimulationStateChange: (state: ProjectSimulationState) => void;
}

/**
 * Deterministic simulation surface: scenario controls, projected constraint,
 * per-component estimates, and baseline comparison. Every number is derived
 * locally from the document and the supplied assumptions.
 */
export function SimulationWorkspace({
  document,
  simulationState,
  onSimulationStateChange,
}: SimulationWorkspaceProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [persistError, setPersistError] = useState<string | null>(null);

  const scenario: Scenario = simulationState?.scenario ?? BASELINE_SCENARIO;
  const profile: SimulationProfile = simulationState?.profile ?? initialProfile();
  const capacityProfile: CapacityProfile = profile.capacityProfile;
  const freshness = getSimulationFreshness(simulationState, document);
  const baselineUsageProfile: UsageProfile = useMemo(() => defaultUsageFor(document), [document]);

  // Results are always recomputed from the document on screen — never restored
  // from storage — so a displayed estimate can never describe a stale graph.
  const result = useMemo(
    () =>
      simulationState === null ? null : runSimulation({ document, scenario, capacityProfile }),
    [document, scenario, capacityProfile, simulationState],
  );

  const comparison = useMemo(() => {
    if (result === null || scenario.id === BASELINE_SCENARIO.id) return null;
    const baseline = runSimulation({
      document,
      scenario: BASELINE_SCENARIO,
      capacityProfile,
    });
    return compareSimulations(baseline, result);
  }, [document, result, scenario.id, capacityProfile]);
  const scenarioCost = useMemo(() => {
    if (result === null) return null;
    const factor = Math.max(
      0,
      scenario.requestsPerSecond / Math.max(1, BASELINE_SCENARIO.requestsPerSecond),
    );
    const baseline = estimateArchitectureCost({
      document,
      provider: "aws",
      region: "us-east-1",
      usageProfile: baselineUsageProfile,
    });
    const projected = estimateArchitectureCost({
      document,
      provider: "aws",
      region: "us-east-1",
      usageProfile: scaleUsageProfileByFactor(baselineUsageProfile, factor),
    });
    return {
      factor,
      baseline,
      projected,
      delta: projected.expectedMonthly - baseline.expectedMonthly,
    };
  }, [baselineUsageProfile, document, result, scenario.requestsPerSecond]);

  const persist = async (nextScenario: Scenario, nextProfile: SimulationProfile) => {
    // The run recorded alongside the inputs is the one those inputs produce.
    const runResult = runSimulation({
      document,
      scenario: nextScenario,
      capacityProfile: nextProfile.capacityProfile,
    });
    const next = buildSimulationState({
      document,
      scenario: nextScenario,
      profile: nextProfile,
      result: runResult,
      now: new Date().toISOString(),
    });
    try {
      await getSimulationRepository().saveSimulationState(next);
      setPersistError(null);
      onSimulationStateChange(next);
    } catch (error) {
      setPersistError(
        error instanceof Error ? error.message : "Could not save the simulation locally.",
      );
    }
  };

  const selected = result?.components.find((component) => component.nodeId === selectedNodeId);
  const selectedComparison = comparison?.components.find((item) => item.nodeId === selectedNodeId);

  const saveAssumptions = (nodeId: string, override: ComponentCapacityOverride) => {
    // An empty override means "use defaults" — drop the entry rather than
    // storing a blank object.
    const components = Object.fromEntries(
      Object.entries(capacityProfile.components).filter(([id]) => id !== nodeId),
    );
    if (Object.keys(override).length > 0) {
      components[nodeId] = override;
    }
    // withCapacityProfile bumps the profile revision, which is what makes a
    // prior run report ASSUMPTIONS_CHANGED until it is rerun.
    const nextProfile = withCapacityProfile(profile, { ...capacityProfile, components });
    void persist(scenario, nextProfile);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              void persist(scenario, profile);
            }}
          >
            {freshness === "never-run" ? "Run Simulation" : "Rerun Simulation"}
          </Button>
          <p
            role="status"
            aria-live="polite"
            aria-label="Simulation status"
            className={cx(
              "type-mono-data",
              persistError !== null
                ? "text-critical"
                : freshness === "architecture-changed" || freshness === "model-updated"
                  ? "text-warning"
                  : "text-foreground-muted",
            )}
          >
            {persistError !== null
              ? `SIMULATION_SAVE_FAILED · ${persistError}`
              : FRESHNESS_TEXT[freshness]}
          </p>
        </div>
      </div>

      <p className="type-body-md border-2 border-border-strong bg-surface-muted p-3">
        {SIMULATION_DISCLAIMER}
      </p>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Traffic scenario">
        <span className="type-label-caps text-foreground-muted">Scenario</span>
        {SCENARIO_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={preset.id === scenario.id}
            onClick={() => {
              void persist(preset, profile);
            }}
            className={cx(
              "type-label-caps border-2 px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-accent",
              preset.id === scenario.id
                ? "border-accent bg-accent-muted text-foreground"
                : "border-border text-foreground-muted hover:border-border-strong",
            )}
          >
            {preset.label}
            <span className="sr-only">
              {" "}
              — modeled request rate {String(preset.requestsPerSecond)} per second
            </span>
          </button>
        ))}
        <span className="type-mono-data text-foreground-muted">
          {formatRps(scenario.requestsPerSecond)} rps modeled request rate
        </span>
      </div>

      {result === null ? (
        <div className="border-2 border-dashed border-border-strong p-8">
          <p className="type-body-lg">This project has not been simulated yet.</p>
          <p className="type-body-md mt-2 text-foreground-muted">
            AXON propagates a modeled request rate across the represented dependency paths and
            estimates where the architecture is projected to reach a limit first, based on supplied
            assumptions.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6 xl:flex-row">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {scenarioCost !== null ? (
              <section
                className="border-2 border-border bg-surface p-4"
                aria-label="Scenario cost impact"
              >
                <h2 className="type-label-caps text-foreground-muted">Scenario Cost Impact</h2>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <div className="border-2 border-border bg-surface-muted p-3">
                    <p className="type-label-caps text-foreground-muted">Baseline</p>
                    <p className="type-mono-data mt-1 text-foreground">
                      {money(scenarioCost.baseline.expectedMonthly)}
                    </p>
                  </div>
                  <div className="border-2 border-border-strong bg-surface-muted p-3">
                    <p className="type-label-caps text-foreground-muted">
                      {scenarioCost.factor.toFixed(1)}x scenario
                    </p>
                    <p className="type-mono-data mt-1 text-foreground">
                      {money(scenarioCost.projected.expectedMonthly)}
                    </p>
                  </div>
                  <div className="border-2 border-border bg-surface-muted p-3">
                    <p className="type-label-caps text-foreground-muted">Delta</p>
                    <p className="type-mono-data mt-1 text-foreground">
                      {scenarioCost.delta >= 0 ? "+" : ""}
                      {money(scenarioCost.delta)}
                    </p>
                  </div>
                </div>
                <p className="type-body-sm mt-3 text-foreground-muted">
                  AWS · us-east-1 · catalog {scenarioCost.projected.pricingCatalogVersion} ·
                  scenario-derived usage for non-fixed drivers.
                </p>
              </section>
            ) : null}
            <section aria-label="Projected constraint">
              <h2 className="type-label-caps text-foreground-muted">First projected constraint</h2>
              {result.firstConstraint === null ? (
                <p className="type-body-md mt-2 text-foreground-muted">
                  No component carries modeled load under this scenario.
                </p>
              ) : (
                <div className="mt-2 border-2 border-border-strong bg-surface p-4">
                  <p className="type-headline-md">{result.firstConstraint.name}</p>
                  <p className="type-body-md mt-2">
                    Projected to reach its modeled limit at approximately{" "}
                    <span className="type-mono-data">
                      {formatRps(result.firstConstraint.saturationRps)} rps
                    </span>{" "}
                    of front-door traffic, based on supplied assumptions.
                  </p>
                </div>
              )}
            </section>

            <section aria-label="Component estimates">
              <h2 className="type-label-caps text-foreground-muted">
                Components ({result.components.length})
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {result.components.map((component) => (
                  <li key={component.nodeId}>
                    <button
                      type="button"
                      aria-pressed={component.nodeId === selectedNodeId}
                      onClick={() => {
                        setSelectedNodeId(component.nodeId);
                      }}
                      className={cx(
                        "flex w-full flex-wrap items-center justify-between gap-2 rounded-module border-2 p-3 text-left",
                        "focus-visible:outline-2 focus-visible:outline-accent",
                        component.nodeId === selectedNodeId
                          ? "border-accent bg-accent-muted/40"
                          : "border-border bg-surface hover:border-border-strong",
                      )}
                    >
                      <span className="type-body-md font-semibold">{component.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="type-mono-data text-foreground-muted">
                          {(component.utilization * 100).toFixed(0)}%
                        </span>
                        <StatusBadge kind={STATUS_KIND[component.status]}>
                          {STATUS_LABEL[component.status]}
                        </StatusBadge>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            {result.unmodeledNodeIds.length > 0 && (
              <p className="type-mono-data text-foreground-muted">
                NOT_MODELED · {result.unmodeledNodeIds.length} component
                {result.unmodeledNodeIds.length === 1 ? "" : "s"} have no capacity model and
                contribute no projected constraint.
              </p>
            )}
          </div>

          <aside
            aria-label="Component inspector"
            className="w-full shrink-0 border-2 border-border-strong bg-surface p-5 xl:w-[26rem]"
          >
            {selected !== undefined ? (
              <div className="flex flex-col gap-6">
                <ComponentResultInspector component={selected} comparison={selectedComparison} />
                <section
                  aria-label="Capacity assumptions"
                  className="border-t-2 border-border pt-5"
                >
                  <h3 className="type-label-caps mb-3 text-foreground-muted">
                    Edit capacity assumptions
                  </h3>
                  <AssumptionControls
                    component={selected}
                    override={capacityProfile.components[selected.nodeId]}
                    onSave={saveAssumptions}
                  />
                </section>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="type-label-caps text-foreground-muted">Component inspector</p>
                <p className="type-body-md text-foreground-muted">
                  Select a component to see its modeled load, which values are your inputs versus
                  AXON defaults, and what this model does not represent.
                </p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
