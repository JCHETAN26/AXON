import {
  DEFAULT_ASYNC_FANOUT_PERCENT,
  EMPTY_CAPACITY_PROFILE,
  resolveCapacity,
  type CapacityProfile,
} from "./capacity-profile";
import { readArchitectureCapacity } from "./architecture-capacity";
import { classifyComponent, type ComponentKind } from "./component-kind";
import { deriveConfidence } from "./confidence";
import { evaluateComponent } from "./evaluators";
import {
  carriesLoad,
  computePropagationOrder,
  edgeLoadShare,
  findEntryNodeIds,
} from "./propagation";
import { BASELINE_SCENARIO, type Scenario } from "./scenario";
import {
  type ComponentResult,
  type ComponentStatus,
  type ProjectedConstraint,
  type SimulationResult,
} from "./types";

import { buildGraphIndex, type ArchitectureDocument } from "@axon/diagram-schema";

/** Bumped whenever propagation or any evaluator changes behaviour. */
export const SIMULATION_MODEL_VERSION = "1.0.0";

export const APPROACHING_LIMIT_UTILIZATION = 0.75;

export const SIMULATION_DISCLAIMER =
  "Estimated from supplied architecture parameters—not a production benchmark.";

function statusFor(
  kind: ComponentKind,
  utilization: number,
  offline: boolean,
  hasLoad: boolean,
): ComponentStatus {
  if (offline) return "offline";
  if (kind === "unmodeled") return "not-modeled";
  if (!hasLoad) return "no-represented-load";
  if (utilization >= 1) return "at-limit";
  if (utilization >= APPROACHING_LIMIT_UTILIZATION) return "approaching-limit";
  return "within-capacity";
}

export interface RunSimulationInput {
  readonly document: ArchitectureDocument;
  readonly scenario?: Scenario;
  readonly capacityProfile?: CapacityProfile;
}

/**
 * Pure, deterministic simulation pass. The same document, capacity profile,
 * scenario, and model version always produce the same result and ordering.
 * No clock, no randomness, no network, no model calls, no load generation.
 */
export function runSimulation({
  document,
  scenario = BASELINE_SCENARIO,
  capacityProfile = EMPTY_CAPACITY_PROFILE,
}: RunSimulationInput): SimulationResult {
  const index = buildGraphIndex(document);
  const { order, cycleNodeIds } = computePropagationOrder(document, index);
  const asyncFanoutPercent = capacityProfile.asyncFanoutPercent ?? DEFAULT_ASYNC_FANOUT_PERCENT;
  const offline = new Set(scenario.offlineNodeIds);
  const cycleSet = new Set(cycleNodeIds);

  // Scenario traffic enters at every represented front door. Where an
  // architecture has several, each is modeled as receiving the full rate.
  const entryNodeIds = new Set(findEntryNodeIds(document, index));
  const inbound = new Map<string, number>(
    document.nodes.map((node) => [
      node.id,
      entryNodeIds.has(node.id) ? scenario.requestsPerSecond : 0,
    ]),
  );

  const results: ComponentResult[] = [];

  for (const nodeId of order) {
    const node = index.nodesById.get(nodeId);
    if (node === undefined) continue;

    const kind = classifyComponent(node);
    // Precedence: user override, then what the architecture itself states,
    // then an AXON default.
    const capacity = resolveCapacity(
      kind,
      capacityProfile.components[nodeId],
      readArchitectureCapacity(node, kind),
    );
    const isOffline = offline.has(nodeId);
    const inboundRps = inbound.get(nodeId) ?? 0;

    // An offline component serves nothing and forwards nothing.
    const evaluation = evaluateComponent(kind, {
      inboundRps: isOffline ? 0 : inboundRps,
      capacity,
    });
    const outboundRps = isOffline ? 0 : evaluation.outboundRps;

    // Back edges into a cycle carry no load: AXON does not model feedback.
    for (const edge of (index.outgoing.get(nodeId) ?? []).filter(carriesLoad)) {
      if (cycleSet.has(nodeId) && cycleSet.has(edge.target)) continue;
      const share = edgeLoadShare(edge, asyncFanoutPercent, kind);
      inbound.set(edge.target, (inbound.get(edge.target) ?? 0) + outboundRps * share);
    }

    const utilization = isOffline ? 0 : evaluation.utilization;
    const confidence = deriveConfidence(kind, capacity);
    const hasLoad = inboundRps > 0;
    const limitations = [...evaluation.limitations];
    if (isOffline) {
      limitations.unshift(
        "Assumed unavailable in this scenario; downstream components receive no load from it.",
      );
    }
    if (cycleSet.has(nodeId)) {
      limitations.unshift(
        "Part of a represented dependency cycle. Load is not propagated around the cycle, so this estimate may be low.",
      );
    }

    results.push({
      nodeId,
      name: node.name,
      kind,
      inboundRps: isOffline ? 0 : inboundRps,
      outboundRps,
      utilization,
      // Utilization is linear in scenario rate, so the saturation point is exact
      // within the model.
      saturationRps:
        !isOffline && kind !== "unmodeled" && utilization > 0
          ? scenario.requestsPerSecond / utilization
          : null,
      status: statusFor(kind, utilization, isOffline, hasLoad),
      confidence: confidence.level,
      confidenceRationale: confidence.rationale,
      evidence: evaluation.evidence,
      limitations,
    });
  }

  results.sort((a, b) => (a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0));

  const firstConstraint = results
    .filter(
      (result): result is ComponentResult & { saturationRps: number } =>
        result.saturationRps !== null,
    )
    .sort((a, b) => {
      const bySaturation = a.saturationRps - b.saturationRps;
      if (bySaturation !== 0) return bySaturation;
      return a.nodeId < b.nodeId ? -1 : 1;
    })
    .map((result): ProjectedConstraint => ({
      nodeId: result.nodeId,
      name: result.name,
      kind: result.kind,
      saturationRps: result.saturationRps,
      utilizationAtScenario: result.utilization,
    }))[0];

  return {
    modelVersion: SIMULATION_MODEL_VERSION,
    scenarioId: scenario.id,
    requestsPerSecond: scenario.requestsPerSecond,
    components: results,
    firstConstraint: firstConstraint ?? null,
    unmodeledNodeIds: results
      .filter((result) => result.kind === "unmodeled")
      .map((result) => result.nodeId),
    cycleNodeIds: [...cycleNodeIds].sort(),
  };
}
