import { type ArchitectureNodeModel } from "@axon/diagram-schema";

/**
 * Component behaviours AXON can model. Anything AXON cannot map is
 * "unmodeled" and is reported as such — never silently treated as a service.
 */
export type ComponentKind =
  "service" | "cache" | "database" | "queue" | "worker" | "external" | "unmodeled";

export const COMPONENT_KIND_LABEL: Record<ComponentKind, string> = {
  service: "Service",
  cache: "Cache",
  database: "Database",
  queue: "Queue",
  worker: "Worker pool",
  external: "External dependency",
  unmodeled: "Not modeled",
};

/**
 * Category keywords, checked in this order. The mapping is intentionally
 * explicit and conservative: an unrecognised category stays unmodeled so the
 * result can say so, rather than inventing capacity for it.
 */
const CATEGORY_PATTERNS: readonly (readonly [ComponentKind, readonly string[]])[] = [
  ["cache", ["cache", "cdn", "edge network"]],
  ["database", ["database", "datastore", "storage", "warehouse", "search index"]],
  ["queue", ["queue", "broker", "stream", "topic", "bus"]],
  ["worker", ["worker", "job", "batch", "consumer"]],
  ["external", ["external", "third-party", "third party", "saas", "payment provider", "vendor"]],
  ["service", ["service", "api", "gateway", "compute", "routing", "auth", "function", "server"]],
];

/**
 * Classifies a node from its category. Category is user-supplied text, so the
 * match is case-insensitive and substring-based; the node's own `kind` is not
 * part of the document schema, which is why this inference exists at all.
 */
export function classifyComponent(node: ArchitectureNodeModel): ComponentKind {
  const category = node.category.toLowerCase();
  for (const [kind, keywords] of CATEGORY_PATTERNS) {
    for (const keyword of keywords) {
      if (category.includes(keyword)) {
        return kind;
      }
    }
  }
  return "unmodeled";
}
