import { z } from "zod";

import { type ComponentKind } from "./component-kind";
import { type ValueBasis } from "./types";

/**
 * Capacity inputs. Only user overrides are persisted; defaults come from the
 * model version, so a value's provenance is always computable rather than
 * stored — a stored "default" would become a lie the moment the model changes.
 */

const positive = z.number().positive();
const percent = z.number().min(0).max(100);

export const ComponentCapacityOverrideSchema = z.object({
  /** Requests per second one unit (replica, instance) can serve. */
  requestsPerSecondPerUnit: positive.optional(),
  /** Replicas, instances, or workers. */
  units: positive.optional(),
  /** Cache only: share of requests served without touching downstream. */
  cacheHitPercent: percent.optional(),
  /** Database only: connection ceiling. */
  maxConnections: positive.optional(),
  /** Database only: connections held per request/second. */
  connectionsPerRequest: positive.optional(),
});

export const CapacityProfileSchema = z.object({
  /** Per-node overrides, keyed by node id. */
  components: z.record(z.string().min(1), ComponentCapacityOverrideSchema),
  /** Share of requests that continue along an async edge (job fan-out). */
  asyncFanoutPercent: percent.optional(),
});

export type ComponentCapacityOverride = z.infer<typeof ComponentCapacityOverrideSchema>;
export type CapacityProfile = z.infer<typeof CapacityProfileSchema>;

export const EMPTY_CAPACITY_PROFILE: CapacityProfile = { components: {} };

/** Resolved capacity for one component, with every field's provenance known. */
export interface ResolvedCapacity {
  readonly requestsPerSecondPerUnit: number;
  readonly units: number;
  readonly cacheHitPercent: number;
  readonly maxConnections: number;
  readonly connectionsPerRequest: number;
  /** Where each value came from: user input, the architecture, or a default. */
  readonly fieldBasis: Readonly<Record<string, ValueBasis>>;
}

/**
 * AXON defaults per component kind. These are starting assumptions for a
 * modest cloud deployment, not measurements of anyone's system.
 */
const KIND_DEFAULTS: Record<ComponentKind, Omit<ResolvedCapacity, "fieldBasis">> = {
  service: {
    requestsPerSecondPerUnit: 200,
    units: 6,
    cacheHitPercent: 0,
    maxConnections: 0,
    connectionsPerRequest: 0,
  },
  cache: {
    requestsPerSecondPerUnit: 50_000,
    units: 1,
    cacheHitPercent: 90,
    maxConnections: 0,
    connectionsPerRequest: 0,
  },
  database: {
    requestsPerSecondPerUnit: 5_000,
    units: 1,
    cacheHitPercent: 0,
    maxConnections: 300,
    // 82 connections at 1,200 rps — the sample architecture's documented ratio.
    connectionsPerRequest: 82 / 1200,
  },
  queue: {
    requestsPerSecondPerUnit: 5_000,
    units: 1,
    cacheHitPercent: 0,
    maxConnections: 0,
    connectionsPerRequest: 0,
  },
  worker: {
    requestsPerSecondPerUnit: 25,
    units: 8,
    cacheHitPercent: 0,
    maxConnections: 0,
    connectionsPerRequest: 0,
  },
  external: {
    requestsPerSecondPerUnit: 1_000,
    units: 1,
    cacheHitPercent: 0,
    maxConnections: 0,
    connectionsPerRequest: 0,
  },
  unmodeled: {
    requestsPerSecondPerUnit: 0,
    units: 0,
    cacheHitPercent: 0,
    maxConnections: 0,
    connectionsPerRequest: 0,
  },
};

/** Default share of requests that fan out along an async edge. */
export const DEFAULT_ASYNC_FANOUT_PERCENT = 4;

export const CAPACITY_FIELDS = [
  "requestsPerSecondPerUnit",
  "units",
  "cacheHitPercent",
  "maxConnections",
  "connectionsPerRequest",
] as const;

export type CapacityField = (typeof CAPACITY_FIELDS)[number];

/**
 * The capacity fields each kind's evaluator consumes — the single source of
 * truth for which assumptions are worth editing and which fields confidence
 * is graded on.
 */
export const CAPACITY_FIELDS_BY_KIND: Record<ComponentKind, readonly CapacityField[]> = {
  service: ["units", "requestsPerSecondPerUnit"],
  cache: ["units", "requestsPerSecondPerUnit", "cacheHitPercent"],
  database: ["maxConnections", "connectionsPerRequest"],
  queue: ["units", "requestsPerSecondPerUnit"],
  worker: ["units", "requestsPerSecondPerUnit"],
  external: ["units", "requestsPerSecondPerUnit"],
  unmodeled: [],
};

/**
 * Resolves one component's capacity across three sources, in precedence
 * order: an explicit user override, an assumption read from the architecture
 * document itself, then an AXON default. Each field records which source it
 * came from, so a value is never misattributed in the result.
 */
export function resolveCapacity(
  kind: ComponentKind,
  override: ComponentCapacityOverride | undefined,
  architectureInput: ComponentCapacityOverride = {},
): ResolvedCapacity {
  const defaults = KIND_DEFAULTS[kind];
  const values = {} as Record<CapacityField, number>;
  const fieldBasis = {} as Record<CapacityField, ValueBasis>;

  for (const field of CAPACITY_FIELDS) {
    const fromUser = override?.[field];
    const fromArchitecture = architectureInput[field];
    if (fromUser !== undefined) {
      values[field] = fromUser;
      fieldBasis[field] = "user-input";
    } else if (fromArchitecture !== undefined) {
      values[field] = fromArchitecture;
      fieldBasis[field] = "architecture-input";
    } else {
      values[field] = defaults[field];
      fieldBasis[field] = "axon-default";
    }
  }

  return { ...values, fieldBasis };
}
