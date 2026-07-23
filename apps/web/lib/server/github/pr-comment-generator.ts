import { type ArchitectureProposal } from "@axon/repo-intel";

export type ArchitectureRisk = "critical" | "high" | "medium" | "low" | "none";

export interface PrImpactSummary {
  risk: ArchitectureRisk;
  addedComponentsCount: number;
  removedComponentsCount: number;
  modifiedComponentsCount: number;
  conflictsCount: number;
  unresolvedCount: number;
  changedFilesCount: number;
}

export function generatePrReviewMarkdown(
  prNumber: number,
  prTitle: string,
  headSha: string,
  summary: PrImpactSummary,
  proposal: ArchitectureProposal
): string {
  const riskBadge =
    summary.risk === "critical"
      ? "🔴 **CRITICAL ARCHITECTURE IMPACT**"
      : summary.risk === "high"
      ? "🟠 **HIGH ARCHITECTURE IMPACT**"
      : summary.risk === "medium"
      ? "🟡 **MEDIUM ARCHITECTURE IMPACT**"
      : summary.risk === "low"
      ? "🔵 **LOW ARCHITECTURE IMPACT**"
      : "🟢 **NO ARCHITECTURE IMPACT**";

  const componentsTable =
    proposal.components.length > 0
      ? [
          "| Component | Category | Technology | Review Status |",
          "| --- | --- | --- | --- |",
          ...proposal.components.map(
            (c) => `| **${c.name}** | \`${c.category}\` | \`${c.technology ?? "custom"}\` | \`${c.review}\` |`
          ),
        ].join("\n")
      : "_No architectural components modified in this pull request._";

  const conflictsSection =
    proposal.conflicts.length > 0
      ? [
          "### ⚠️ Architecture Conflicts",
          ...proposal.conflicts.map((conf) => `- **Conflict**: ${conf.summary}`),
        ].join("\n")
      : "";

  return [
    `## 📐 AXON Architecture Review — PR #${prNumber}`,
    "",
    `> **Title**: ${prTitle}  `,
    `> **Head Commit**: \`${headSha.substring(0, 8)}\`  `,
    `> **Assessment**: ${riskBadge}`,
    "",
    "### 📊 Architecture Impact Summary",
    `- **Added Components**: ${summary.addedComponentsCount}`,
    `- **Removed Components**: ${summary.removedComponentsCount}`,
    `- **Modified Components**: ${summary.modifiedComponentsCount}`,
    `- **Detected Conflicts**: ${summary.conflictsCount}`,
    `- **Unresolved Items**: ${summary.unresolvedCount}`,
    "",
    "### 🧱 Proposed Architecture Components",
    componentsTable,
    "",
    conflictsSection,
    "",
    "---",
    "_Generated automatically by **AXON Architecture Intelligence**._",
  ]
    .filter(Boolean)
    .join("\n");
}
