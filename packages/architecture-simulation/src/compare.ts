import { type ComponentResult, type SimulationResult } from "./types";

export interface ComponentComparison {
  readonly nodeId: string;
  readonly name: string;
  readonly baseline: ComponentResult | null;
  readonly scenario: ComponentResult | null;
  /** Scenario utilization minus baseline utilization; null if either is absent. */
  readonly utilizationDelta: number | null;
  readonly direction: "increase" | "decrease" | "unchanged" | "not-comparable";
}

export interface SimulationComparison {
  readonly baselineScenarioId: string;
  readonly scenarioId: string;
  readonly components: readonly ComponentComparison[];
  /** True when the two runs used different model versions. */
  readonly modelVersionMismatch: boolean;
}

/**
 * Pure baseline-versus-scenario diff. Components present in only one run are
 * reported as not-comparable rather than being treated as a change.
 */
export function compareSimulations(
  baseline: SimulationResult,
  scenario: SimulationResult,
): SimulationComparison {
  const baselineByNode = new Map(baseline.components.map((result) => [result.nodeId, result]));
  const scenarioByNode = new Map(scenario.components.map((result) => [result.nodeId, result]));
  const nodeIds = [...new Set([...baselineByNode.keys(), ...scenarioByNode.keys()])].sort();

  const components = nodeIds.map((nodeId): ComponentComparison => {
    const before = baselineByNode.get(nodeId) ?? null;
    const after = scenarioByNode.get(nodeId) ?? null;
    if (before === null || after === null) {
      return {
        nodeId,
        name: (after ?? before)?.name ?? nodeId,
        baseline: before,
        scenario: after,
        utilizationDelta: null,
        direction: "not-comparable",
      };
    }
    const delta = after.utilization - before.utilization;
    return {
      nodeId,
      name: after.name,
      baseline: before,
      scenario: after,
      utilizationDelta: delta,
      direction: delta > 0 ? "increase" : delta < 0 ? "decrease" : "unchanged",
    };
  });

  return {
    baselineScenarioId: baseline.scenarioId,
    scenarioId: scenario.scenarioId,
    components,
    modelVersionMismatch: baseline.modelVersion !== scenario.modelVersion,
  };
}
