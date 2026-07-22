import { type GeneratedArchitectureDraft } from "./draft-schema";

/** Turns any key the model produced into a stable lowercase slug. */
export function slugifyKey(raw: string): string {
  const slug = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug.length > 0 ? slug : "node";
}

function uniqueSlug(base: string, taken: Set<string>): string {
  let candidate = base;
  let suffix = 2;
  while (taken.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  taken.add(candidate);
  return candidate;
}

/**
 * Deterministic cleanup of a valid draft: slugified unique keys, consistent
 * references, deduplicated edges and assumptions. Never invents content.
 */
export function normalizeDraft(draft: GeneratedArchitectureDraft): GeneratedArchitectureDraft {
  const groupKeyMap = new Map<string, string>();
  const takenGroupKeys = new Set<string>();
  const groups = draft.groups.map((group) => {
    const key = uniqueSlug(slugifyKey(group.key), takenGroupKeys);
    groupKeyMap.set(group.key, key);
    return { key, label: group.label.trim() };
  });

  const nodeKeyMap = new Map<string, string>();
  const takenNodeKeys = new Set<string>();
  const nodes = draft.nodes.map((node) => {
    const key = uniqueSlug(slugifyKey(node.key), takenNodeKeys);
    nodeKeyMap.set(node.key, key);
    const groupKey = node.groupKey !== undefined ? groupKeyMap.get(node.groupKey) : undefined;
    return {
      key,
      name: node.name.trim(),
      category: node.category.trim(),
      // Unknown group references are dropped rather than trusted.
      ...(groupKey !== undefined && { groupKey }),
    };
  });

  const seenEdges = new Set<string>();
  const edges = draft.edges.flatMap((edge) => {
    const sourceKey = nodeKeyMap.get(edge.sourceKey);
    const targetKey = nodeKeyMap.get(edge.targetKey);
    if (sourceKey === undefined || targetKey === undefined || sourceKey === targetKey) {
      return [];
    }
    const signature = `${sourceKey}→${targetKey}→${edge.kind}`;
    if (seenEdges.has(signature)) {
      return [];
    }
    seenEdges.add(signature);
    return [{ sourceKey, targetKey, kind: edge.kind }];
  });

  const seenAssumptions = new Set<string>();
  const assumptions = draft.assumptions.flatMap((assumption) => {
    const label = assumption.label.trim();
    if (seenAssumptions.has(label.toLowerCase())) {
      return [];
    }
    seenAssumptions.add(label.toLowerCase());
    return [{ label, value: assumption.value.trim() }];
  });

  return {
    name: draft.name.trim(),
    ...(draft.summary !== undefined && { summary: draft.summary.trim() }),
    assumptions,
    groups,
    nodes,
    edges,
  };
}
