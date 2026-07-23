import { type ArchitectureProposal, type ProposalComponent } from "./schemas";

export interface ProposalComponentDiff {
  /** Components present at head but not at base — introduced by the change. */
  readonly added: ProposalComponent[];
  /** Components present at base but not at head — removed by the change. */
  readonly removed: ProposalComponent[];
  /** Components present in both whose evidence-derived confidence changed. */
  readonly modified: ProposalComponent[];
  /** Components present in both with unchanged confidence. */
  readonly unchanged: ProposalComponent[];
}

/**
 * Stable semantic identity for a proposed component. The component `id` is a
 * random UUID per build, so diffing uses the reconciliation key
 * (technology-or-name + category), matching how {@link buildProposal} groups
 * evidence. Case-insensitive so `pg`/`PG` reconcile to one identity.
 */
export function componentIdentity(component: ProposalComponent): string {
  const label = (component.technology ?? component.name).trim().toLowerCase();
  return `${label}|${component.category}`;
}

/**
 * Computes the architecture-level delta between the proposal inferred at a base
 * commit and the one inferred at a head commit. This is what a pull request
 * actually does to the architecture — components added, removed, or changed in
 * confidence — independent of which files moved.
 */
export function diffProposalComponents(
  base: ArchitectureProposal,
  head: ArchitectureProposal,
): ProposalComponentDiff {
  const baseByIdentity = new Map(base.components.map((c) => [componentIdentity(c), c]));
  const headByIdentity = new Map(head.components.map((c) => [componentIdentity(c), c]));

  const added: ProposalComponent[] = [];
  const removed: ProposalComponent[] = [];
  const modified: ProposalComponent[] = [];
  const unchanged: ProposalComponent[] = [];

  for (const [identity, headComponent] of headByIdentity) {
    const baseComponent = baseByIdentity.get(identity);
    if (baseComponent === undefined) {
      added.push(headComponent);
    } else if (baseComponent.confidence !== headComponent.confidence) {
      modified.push(headComponent);
    } else {
      unchanged.push(headComponent);
    }
  }
  for (const [identity, baseComponent] of baseByIdentity) {
    if (!headByIdentity.has(identity)) removed.push(baseComponent);
  }

  return { added, removed, modified, unchanged };
}
