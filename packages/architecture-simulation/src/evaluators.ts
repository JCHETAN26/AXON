import { type ResolvedCapacity } from "./capacity-profile";
import { type ComponentKind } from "./component-kind";
import { type SimulationEvidence, type ValueBasis } from "./types";

/**
 * Per-kind evaluation. Each evaluator is a pure function of inbound load and
 * resolved capacity: no clock, no randomness, no iteration to convergence.
 */

export interface EvaluationInput {
  readonly inboundRps: number;
  readonly capacity: ResolvedCapacity;
}

export interface Evaluation {
  readonly utilization: number;
  /** Rate continuing downstream — a cache forwards only its misses. */
  readonly outboundRps: number;
  readonly evidence: readonly SimulationEvidence[];
  readonly limitations: readonly string[];
}

function round(value: number, places = 2): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function rps(value: number): string {
  return `${String(round(value, 1))} rps`;
}

/** Capacity fields the user set explicitly read as user input, not defaults. */
function basisFor(capacity: ResolvedCapacity, field: keyof ResolvedCapacity): ValueBasis {
  return capacity.fieldBasis[field] ?? "axon-default";
}

function capacityEvidence(capacity: ResolvedCapacity, unitLabel: string): SimulationEvidence[] {
  return [
    {
      label: "Units",
      value: `${String(capacity.units)} ${unitLabel}`,
      basis: basisFor(capacity, "units"),
    },
    {
      label: "Capacity per unit",
      value: rps(capacity.requestsPerSecondPerUnit),
      basis: basisFor(capacity, "requestsPerSecondPerUnit"),
    },
  ];
}

function throughputEvaluation(
  { inboundRps, capacity }: EvaluationInput,
  unitLabel: string,
  limitations: readonly string[],
): Evaluation {
  const total = capacity.requestsPerSecondPerUnit * capacity.units;
  return {
    utilization: total === 0 ? 0 : inboundRps / total,
    outboundRps: inboundRps,
    evidence: [
      ...capacityEvidence(capacity, unitLabel),
      { label: "Modeled capacity", value: rps(total), basis: "derived" },
      { label: "Modeled request rate", value: rps(inboundRps), basis: "derived" },
      {
        label: "Estimated utilization",
        value: `${String(round((total === 0 ? 0 : inboundRps / total) * 100, 1))}%`,
        basis: "projected",
      },
    ],
    limitations,
  };
}

const EVALUATORS: Record<ComponentKind, (input: EvaluationInput) => Evaluation> = {
  service: (input) =>
    throughputEvaluation(input, "replicas", [
      "Assumes requests are distributed evenly across replicas.",
      "Does not model per-endpoint cost, cold starts, or garbage-collection pauses.",
    ]),

  cache: (input) => {
    const { inboundRps, capacity } = input;
    const total = capacity.requestsPerSecondPerUnit * capacity.units;
    const missRatio = (100 - capacity.cacheHitPercent) / 100;
    return {
      utilization: total === 0 ? 0 : inboundRps / total,
      // Only misses continue to the downstream datastore.
      outboundRps: inboundRps * missRatio,
      evidence: [
        ...capacityEvidence(capacity, "instances"),
        {
          label: "Cache hit rate",
          value: `${String(capacity.cacheHitPercent)}%`,
          basis: basisFor(capacity, "cacheHitPercent"),
        },
        { label: "Modeled request rate", value: rps(inboundRps), basis: "derived" },
        {
          label: "Modeled miss rate passed downstream",
          value: rps(inboundRps * missRatio),
          basis: "derived",
        },
      ],
      limitations: [
        "Assumes a constant hit rate independent of traffic volume and key distribution.",
        "Does not model eviction, cold caches, or stampede behaviour after a restart.",
      ],
    };
  },

  database: (input) => {
    const { inboundRps, capacity } = input;
    const connections = inboundRps * capacity.connectionsPerRequest;
    return {
      utilization: capacity.maxConnections === 0 ? 0 : connections / capacity.maxConnections,
      outboundRps: inboundRps,
      evidence: [
        {
          label: "Connection limit",
          value: String(capacity.maxConnections),
          basis: basisFor(capacity, "maxConnections"),
        },
        {
          label: "Connections per request/second",
          value: String(round(capacity.connectionsPerRequest, 4)),
          basis: basisFor(capacity, "connectionsPerRequest"),
        },
        { label: "Modeled request rate", value: rps(inboundRps), basis: "derived" },
        {
          label: "Estimated connections held",
          value: String(round(connections, 1)),
          basis: "projected",
        },
      ],
      limitations: [
        "Models connection pressure only — not lock contention, query plans, index health, or disk throughput.",
        "Assumes connection demand scales linearly with request rate.",
      ],
    };
  },

  queue: (input) =>
    throughputEvaluation(input, "brokers", [
      "Models enqueue throughput only — not message size, partitioning, or broker replication lag.",
      "Backlog growth is not projected over time; this is a steady-state estimate.",
    ]),

  worker: (input) => {
    const { inboundRps, capacity } = input;
    const total = capacity.requestsPerSecondPerUnit * capacity.units;
    return {
      utilization: total === 0 ? 0 : inboundRps / total,
      outboundRps: inboundRps,
      evidence: [
        ...capacityEvidence(capacity, "workers"),
        { label: "Modeled drain capacity", value: rps(total), basis: "derived" },
        { label: "Modeled job arrival rate", value: rps(inboundRps), basis: "derived" },
        {
          label: "Estimated utilization",
          value: `${String(round((total === 0 ? 0 : inboundRps / total) * 100, 1))}%`,
          basis: "projected",
        },
      ],
      limitations: [
        "Assumes uniform job cost and no retry amplification.",
        "Does not model backlog accumulated before the scenario began.",
      ],
    };
  },

  external: (input) =>
    throughputEvaluation(input, "endpoints", [
      "Third-party capacity is an assumption — AXON has no visibility into the provider's limits.",
      "Does not model rate-limit responses, contractual quotas, or provider-side incidents.",
    ]),

  unmodeled: ({ inboundRps }) => ({
    utilization: 0,
    outboundRps: inboundRps,
    evidence: [
      { label: "Component behaviour", value: "Not modeled", basis: "unmodeled" },
      { label: "Modeled request rate", value: rps(inboundRps), basis: "derived" },
    ],
    limitations: [
      "AXON has no capacity model for this component's category, so it contributes no projected constraint. Load is passed through unchanged.",
    ],
  }),
};

export function evaluateComponent(kind: ComponentKind, input: EvaluationInput): Evaluation {
  return EVALUATORS[kind](input);
}
