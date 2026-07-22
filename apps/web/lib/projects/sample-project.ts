import {
  ARCHITECTURE_SCHEMA_VERSION,
  parseArchitectureDocument,
  type ArchitectureDocument,
} from "@axon/diagram-schema";

import { DEMO_ASSUMPTIONS, DEMO_EDGES, DEMO_GROUPS, DEMO_NODES } from "@/data/demo-architecture";

/**
 * The explicit — and only — bridge between the landing-page demo dataset and
 * persisted user data. It converts the canonical marketing architecture into
 * a validated ArchitectureDocument owned by the user's project; nothing in
 * the product reads the demo dataset directly.
 */
export function createSampleArchitectureDocument(input: {
  id: string;
  projectId: string;
  now: string;
}): ArchitectureDocument {
  return parseArchitectureDocument({
    schemaVersion: ARCHITECTURE_SCHEMA_VERSION,
    id: input.id,
    projectId: input.projectId,
    name: "SaaS reference architecture",
    description:
      "Sample multi-tenant SaaS architecture — the same system demonstrated on the AXON homepage.",
    createdAt: input.now,
    updatedAt: input.now,
    source: { kind: "sample", label: "Sample: SaaS reference architecture" },
    assumptions: DEMO_ASSUMPTIONS.map((assumption) => ({
      id: assumption.id,
      label: assumption.label,
      value: assumption.value,
    })),
    nodes: DEMO_NODES.map((node) => ({
      id: node.id,
      name: node.name,
      category: node.category,
      groupId: node.groupId,
      meta: node.metrics,
    })),
    edges: DEMO_EDGES.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      kind: edge.kind,
    })),
    groups: DEMO_GROUPS.map((group) => ({ id: group.id, label: group.label })),
    metadata: { generator: "axon-web", notes: "Created from the sample template." },
  });
}
