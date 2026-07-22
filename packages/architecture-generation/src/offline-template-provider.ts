import { type DraftEdge, type DraftNode, type GeneratedArchitectureDraft } from "./draft-schema";
import { type ArchitectureProvider, type ProviderPrompt } from "./provider";

/**
 * Deterministic, dependency-free provider used when no model key is
 * configured and in tests. It assembles a plausible architecture from
 * keyword heuristics over the user's prompt. Its output flows through the
 * exact same parse → validate → normalize pipeline as a real model's.
 */

function has(prompt: string, ...terms: string[]): boolean {
  return terms.some((term) => prompt.includes(term));
}

function deriveName(prompt: string): string {
  const words = prompt
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 3);
  return words.length > 0 ? `${words.join(" ")} architecture` : "Generated architecture";
}

export function buildTemplateDraft(userPrompt: string): GeneratedArchitectureDraft {
  const prompt = userPrompt.toLowerCase();

  const wantsAuth = has(prompt, "auth", "login", "user", "tenant", "account", "saas");
  const wantsCache = has(prompt, "cache", "fast", "latency", "read-heavy", "scale");
  const wantsQueue = has(
    prompt,
    "background",
    "job",
    "queue",
    "async",
    "worker",
    "process",
    "event",
  );
  const wantsPayments = has(prompt, "billing", "payment", "subscription", "checkout", "stripe");
  const wantsStorage = has(
    prompt,
    "file",
    "upload",
    "report",
    "export",
    "document",
    "image",
    "audit log",
  );

  const groups = [
    { key: "edge", label: "Public Edge" },
    { key: "application", label: "Application Layer" },
    { key: "data", label: "Data Layer" },
    { key: "observability", label: "Observability" },
  ];

  const nodes: DraftNode[] = [
    { key: "api-gateway", name: "api-gateway", category: "Gateway", groupKey: "edge" },
    { key: "app-service", name: "app-service", category: "Compute", groupKey: "application" },
    { key: "postgres", name: "postgresql", category: "Database", groupKey: "data" },
    {
      key: "metrics",
      name: "metrics-collector",
      category: "Observability",
      groupKey: "observability",
    },
  ];
  const edges: DraftEdge[] = [
    { sourceKey: "api-gateway", targetKey: "app-service", kind: "sync" as const },
    { sourceKey: "app-service", targetKey: "postgres", kind: "data" as const },
    { sourceKey: "app-service", targetKey: "metrics", kind: "telemetry" as const },
  ];

  if (wantsAuth) {
    nodes.push({
      key: "auth-service",
      name: "auth-service",
      category: "Auth",
      groupKey: "application",
    });
    edges.push({ sourceKey: "api-gateway", targetKey: "auth-service", kind: "sync" as const });
  }
  if (wantsCache) {
    nodes.push({ key: "cache", name: "redis-cache", category: "Cache", groupKey: "data" });
    edges.push({ sourceKey: "app-service", targetKey: "cache", kind: "data" as const });
  }
  if (wantsQueue) {
    nodes.push({ key: "queue", name: "message-queue", category: "Broker", groupKey: "data" });
    nodes.push({
      key: "workers",
      name: "worker-pool",
      category: "Workers",
      groupKey: "application",
    });
    edges.push({ sourceKey: "app-service", targetKey: "queue", kind: "async" as const });
    edges.push({ sourceKey: "queue", targetKey: "workers", kind: "async" as const });
    edges.push({ sourceKey: "workers", targetKey: "metrics", kind: "telemetry" as const });
  }
  if (wantsPayments) {
    nodes.push({
      key: "payments-service",
      name: "payments-service",
      category: "Payments",
      groupKey: "application",
    });
    nodes.push({ key: "payment-provider", name: "payment-provider", category: "External API" });
    edges.push({ sourceKey: "app-service", targetKey: "payments-service", kind: "sync" as const });
    edges.push({
      sourceKey: "payments-service",
      targetKey: "payment-provider",
      kind: "sync" as const,
    });
  }
  if (wantsStorage) {
    nodes.push({
      key: "object-storage",
      name: "object-storage",
      category: "Storage",
      groupKey: "data",
    });
    edges.push({
      sourceKey: wantsQueue ? "workers" : "app-service",
      targetKey: "object-storage",
      kind: "data" as const,
    });
  }

  return {
    name: deriveName(userPrompt),
    summary: "Offline template derived from prompt keywords — not model-generated.",
    assumptions: [
      { label: "Generation mode", value: "Offline template" },
      { label: "Primary datastore", value: "PostgreSQL" },
    ],
    groups,
    nodes,
    edges,
  };
}

export class OfflineTemplateProvider implements ArchitectureProvider {
  readonly id = "offline-template";

  complete(prompt: ProviderPrompt): Promise<string> {
    return Promise.resolve(JSON.stringify(buildTemplateDraft(prompt.user)));
  }
}
