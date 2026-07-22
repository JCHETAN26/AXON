import { type ArchitectureNodeModel } from "@axon/diagram-schema";

import { type ComponentCapacityOverride } from "./capacity-profile";
import { type ComponentKind } from "./component-kind";

/**
 * Capacity hints the user already wrote into their own architecture.
 *
 * A node's `meta` line is free text, but in practice it carries real capacity
 * facts ("conn 82/300", "hit 97.2%", "8 workers"). Reading them lets AXON
 * attribute a value to the architecture rather than presenting the user's own
 * number back to them as an AXON default.
 *
 * Parsing is deliberately conservative: only unambiguous, anchored patterns
 * are recognised, and anything unrecognised is simply left to the defaults.
 */

interface HintPattern {
  readonly field: keyof ComponentCapacityOverride;
  readonly pattern: RegExp;
  /** Kinds the hint is meaningful for; others ignore it. */
  readonly kinds: readonly ComponentKind[];
  parse(match: RegExpMatchArray): number | null;
}

function numeric(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Expands a "5k" style shorthand into 5000. */
function scaled(raw: string | undefined, suffix: string | undefined): number | null {
  const value = numeric(raw);
  if (value === null) return null;
  return suffix?.toLowerCase() === "k" ? value * 1000 : value;
}

const HINT_PATTERNS: readonly HintPattern[] = [
  {
    // "conn 82/300" — the second number is the ceiling.
    field: "maxConnections",
    pattern: /\bconn(?:ections)?\s+\d+\s*\/\s*(\d+)\b/i,
    kinds: ["database"],
    parse: (match) => numeric(match[1]),
  },
  {
    // "hit 97.2%"
    field: "cacheHitPercent",
    pattern: /\bhit(?:\s+rate)?\s+(\d+(?:\.\d+)?)\s*%/i,
    kinds: ["cache"],
    parse: (match) => {
      const value = numeric(match[1]);
      return value !== null && value <= 100 ? value : null;
    },
  },
  {
    // "8 workers", "12 consumers", "6 pods", "3 replicas", "2 instances"
    field: "units",
    pattern: /\b(\d+)\s+(?:workers?|consumers?|pods?|replicas?|instances?|nodes?)\b/i,
    kinds: ["service", "cache", "database", "queue", "worker", "external"],
    parse: (match) => numeric(match[1]),
  },
  {
    // "rate-limit 5k/s"
    field: "requestsPerSecondPerUnit",
    pattern: /\brate[- ]limit\s+(\d+(?:\.\d+)?)\s*(k?)\s*\/\s*s\b/i,
    kinds: ["service", "external", "queue"],
    parse: (match) => scaled(match[1], match[2]),
  },
];

/**
 * Reads capacity hints from a node. Pure and deterministic: patterns are
 * checked in a fixed order and the first match for a field wins.
 */
export function readArchitectureCapacity(
  node: ArchitectureNodeModel,
  kind: ComponentKind,
): ComponentCapacityOverride {
  const meta = node.meta;
  if (meta === undefined) return {};

  const hints: Record<string, number> = {};
  for (const hint of HINT_PATTERNS) {
    if (hints[hint.field] !== undefined) continue;
    if (!hint.kinds.includes(kind)) continue;
    const match = meta.match(hint.pattern);
    if (match === null) continue;
    const value = hint.parse(match);
    if (value !== null) {
      hints[hint.field] = value;
    }
  }
  return hints as ComponentCapacityOverride;
}
