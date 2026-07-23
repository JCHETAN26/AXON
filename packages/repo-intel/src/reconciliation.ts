import { type RepositoryEvidence } from "./schemas";

export type ReconciliationMatchCategory =
  | "confirmed-match"
  | "likely-match"
  | "possible-match"
  | "conflicting"
  | "unresolved"
  | "separate-components";

export interface ReconciliationCandidate {
  id: string;
  sourceComponentId?: string;
  targetComponentId?: string;
  sourceEvidenceIds: string[];
  targetEvidenceIds: string[];
  matchCategory: ReconciliationMatchCategory;
  reason: string;
  userDecision?: "confirmed" | "rejected" | "unresolved";
}

export interface CrossSourceReconciliationResult {
  candidates: ReconciliationCandidate[];
  conflicts: { id: string; description: string; evidenceIds: string[] }[];
  unresolved: { id: string; description: string; evidenceIds: string[] }[];
}

/**
 * Reconciles evidence records across multiple layers (Source code, Docker, Terraform, Kubernetes).
 */
export function reconcileCrossSourceEvidence(
  evidenceList: RepositoryEvidence[]
): CrossSourceReconciliationResult {
  const candidates: ReconciliationCandidate[] = [];
  const conflicts: CrossSourceReconciliationResult["conflicts"] = [];
  const unresolved: CrossSourceReconciliationResult["unresolved"] = [];

  const appEvidences = evidenceList.filter(
    (e) => e.extractor === "js-ts-source" || e.extractor === "package-json" || e.extractor === "python-source"
  );

  const iacEvidences = evidenceList.filter(
    (e) => e.extractor === "terraform" || e.extractor === "kubernetes" || e.extractor === "compose"
  );

  for (const appEv of appEvidences) {
    const appTech = appEv.fact.technology || appEv.fact.name;
    if (!appTech) continue;

    const matches = iacEvidences.filter((iacEv) => {
      const iacTech = iacEv.fact.technology || iacEv.fact.name;
      return iacTech && iacTech.toLowerCase().includes(appTech.toLowerCase());
    });

    if (matches.length === 1) {
      const match = matches[0];
      if (!match) continue;
      candidates.push({
        id: `rec-${appEv.id}-${match.id}`,
        sourceEvidenceIds: [appEv.id],
        targetEvidenceIds: [match.id],
        matchCategory: "confirmed-match",
        reason: `Matched application ${appTech} with IaC declaration ${match.fact.technology ?? match.fact.name}`,
      });
    } else if (matches.length > 1) {
      candidates.push({
        id: `rec-ambiguous-${appEv.id}`,
        sourceEvidenceIds: [appEv.id],
        targetEvidenceIds: matches.map((m) => m.id),
        matchCategory: "unresolved",
        reason: `Application uses ${appTech}, but multiple IaC components match: ${matches.map((m) => m.fact.name).join(", ")}`,
      });
      unresolved.push({
        id: `unres-${appEv.id}`,
        description: `Multiple IaC candidates found for ${appTech}`,
        evidenceIds: [appEv.id, ...matches.map((m) => m.id)],
      });
    }
  }

  // Check for technology conflicts (e.g. App uses PostgreSQL but IaC declares MySQL)
  const appDbEv = appEvidences.find((e) => e.fact.category === "database");
  const iacDbEv = iacEvidences.find((e) => e.fact.category === "database");

  if (appDbEv && iacDbEv) {
    const appTech = (appDbEv.fact.technology || "").toLowerCase();
    const iacTech = (iacDbEv.fact.technology || "").toLowerCase();

    if (appTech && iacTech && !appTech.includes(iacTech) && !iacTech.includes(appTech)) {
      conflicts.push({
        id: `conflict-${appDbEv.id}-${iacDbEv.id}`,
        description: `Technology mismatch: Application expects ${appDbEv.fact.technology}, but IaC declares ${iacDbEv.fact.technology}`,
        evidenceIds: [appDbEv.id, iacDbEv.id],
      });
    }
  }

  return {
    candidates,
    conflicts,
    unresolved,
  };
}
