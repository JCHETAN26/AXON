import { classifyService, type ServiceRole } from "./classify";
import {
  type ArchitectureCandidate,
  type CandidateEdge,
  type CandidateGroup,
  type CandidateNode,
  type Confidence,
  type ParsedComposeModel,
} from "./types";
import { type WarningCollector } from "./warnings";

/** Deterministic, storage-agnostic slug — AXON assigns real ids at approval. */
export function slugify(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "service" : slug;
}

/** Edge kind implied by what the dependency points at. */
function edgeKindForRole(role: ServiceRole): CandidateEdge["kind"] {
  switch (role) {
    case "database":
    case "storage":
      return "data";
    case "queue":
      return "async";
    case "observability":
      return "telemetry";
    default:
      return "sync";
  }
}

/**
 * Converts a parsed Compose model into a classified architecture candidate.
 * Pure and deterministic: nodes and edges are emitted in a stable order and
 * carry the evidence behind every classification.
 */
export function convertToCandidate(
  parsed: ParsedComposeModel,
  warnings: WarningCollector,
  overrides: Readonly<Record<string, string>> = {},
): ArchitectureCandidate {
  // A stable slug per service name; a collision suffixes deterministically.
  const idByService = new Map<string, string>();
  const usedIds = new Set<string>();
  for (const service of parsed.services) {
    let id = slugify(service.name);
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${slugify(service.name)}-${String(suffix)}`;
      suffix += 1;
    }
    usedIds.add(id);
    idByService.set(service.name, id);
  }

  // Networks become groups; the default network is not a meaningful grouping.
  const groups: CandidateGroup[] = parsed.networks
    .filter((network) => network.name !== "default")
    .map((network) => ({ id: slugify(`net-${network.name}`), label: network.name }))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  const groupIds = new Set(groups.map((group) => group.id));

  const roleByService = new Map<string, ServiceRole>();

  const nodes: CandidateNode[] = parsed.services
    .map((service): CandidateNode => {
      const id = idByService.get(service.name) ?? slugify(service.name);
      const classification = classifyService(service);

      // A reviewer's category override wins, but AXON still records that the
      // original classification needed review.
      const overrideCategory = overrides[service.name];
      const category = overrideCategory ?? classification.category;
      const confidence: Confidence =
        overrideCategory !== undefined ? "high" : classification.confidence;
      roleByService.set(
        service.name,
        overrideCategory !== undefined ? "service" : classification.role,
      );

      if (classification.confidence === "low" && overrideCategory === undefined) {
        warnings.review(
          "low-confidence-classification",
          `services.${service.name}`,
          `"${service.name}" could not be classified from the supplied document.`,
          "Imported as a service; review and correct the category before or after import.",
        );
      }

      // First represented network becomes the node's group.
      const groupId = service.networks
        .map((network) => slugify(`net-${network}`))
        .find((candidate) => groupIds.has(candidate));

      const metaParts: string[] = [];
      if (service.image !== undefined) metaParts.push(service.image);
      if (service.ports.length > 0) {
        metaParts.push(`ports ${service.ports.map((port) => port.raw).join(", ")}`);
      }
      if (service.namedVolumes.length > 0) {
        metaParts.push(`volumes ${service.namedVolumes.join(", ")}`);
      }
      const meta = metaParts.join(" · ") || undefined;

      return {
        id,
        name: service.name,
        category,
        ...(groupId !== undefined && { groupId }),
        ...(meta !== undefined && { meta }),
        classification: confidence,
        rationale:
          overrideCategory !== undefined
            ? `Category set to "${overrideCategory}" during review.`
            : classification.rationale,
      };
    })
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  const edges = buildEdges(parsed, idByService, roleByService);

  return { nodes, edges, groups };
}

function buildEdges(
  parsed: ParsedComposeModel,
  idByService: ReadonlyMap<string, string>,
  roleByService: ReadonlyMap<string, ServiceRole>,
): CandidateEdge[] {
  const seen = new Set<string>();
  const edges: CandidateEdge[] = [];

  for (const dependency of parsed.dependencies) {
    const source = idByService.get(dependency.from);
    const target = idByService.get(dependency.to);
    // A dependency pointing at an undeclared service is dropped — it cannot be
    // represented without inventing a node.
    if (source === undefined || target === undefined || source === target) continue;

    const kind = edgeKindForRole(roleByService.get(dependency.to) ?? "service");
    const id = `${source}--${target}--${kind}`;
    if (seen.has(id)) continue;
    seen.add(id);

    edges.push({
      id,
      source,
      target,
      kind,
      // depends_on and links are explicit, so the edge itself is high
      // confidence; only its *kind* is inferred.
      confidence: "high",
      rationale: `Detected "${dependency.source}" from "${dependency.from}" to "${dependency.to}"; connection kind inferred from the target's role.`,
    });
  }

  return edges.sort((a, b) => (a.id < b.id ? -1 : 1));
}
