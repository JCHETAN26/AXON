import { type AuditFinding } from "@axon/architecture-audit";
import { type ArchitectureDocument } from "@axon/diagram-schema";

export type CopilotCitationKind =
  "component" | "relationship" | "finding" | "cost-estimate" | "migration-mapping" | "simulation";

export interface CopilotCitation {
  readonly kind: CopilotCitationKind;
  readonly id: string;
  readonly label: string;
  readonly href: string;
}

export interface GroundedCopilotAnswer {
  readonly directAnswer: string;
  readonly citations: readonly CopilotCitation[];
  readonly assumptions: readonly string[];
  readonly confidence: "high" | "medium" | "low" | "insufficient";
  readonly missingInformation: readonly string[];
  readonly limitations: readonly string[];
  readonly suggestedAction: string;
}

export interface CopilotGroundingContext {
  readonly document: ArchitectureDocument;
  readonly findings?: readonly AuditFinding[];
  readonly untrustedEvidenceSnippets?: readonly {
    readonly id: string;
    readonly label: string;
    readonly text: string;
  }[];
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Question words that carry no grounding signal; dropped before matching so a
// natural question ("what database do we use?") keys off "database", not "what".
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "am", "be", "do", "does", "did", "we", "our",
  "us", "my", "me", "i", "you", "your", "of", "in", "on", "at", "to", "and",
  "or", "how", "what", "which", "who", "whom", "where", "when", "why", "use",
  "using", "used", "have", "has", "had", "with", "for", "this", "that", "it",
  "its", "there", "here", "many", "much", "any", "some", "get", "should",
  "would", "could", "can", "will", "was", "were", "about", "into", "from",
  "does", "so", "if", "then", "than", "as",
]);

/** Extracts meaningful lowercase keyword tokens from free text. */
function keywords(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

/** Loose token equality: exact, or one contains the other when long enough to
 * be meaningful (so "databases" ↔ "database", "postgres" ↔ "postgresql"). */
function tokenMatches(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length >= 4 && b.includes(a)) return true;
  if (b.length >= 4 && a.includes(b)) return true;
  return false;
}

/** How many of the question's keywords appear among the target's tokens. */
function overlapScore(questionTokens: readonly string[], targetText: string): number {
  const targetTokens = normalize(targetText).split(" ").filter((t) => t.length > 0);
  let score = 0;
  for (const q of questionTokens) {
    if (targetTokens.some((t) => tokenMatches(q, t))) score += 1;
  }
  return score;
}

function bestMatch<T>(
  items: readonly T[],
  questionTokens: readonly string[],
  targetText: (item: T) => string,
): { item: T; score: number } | null {
  let best: { item: T; score: number } | null = null;
  for (const item of items) {
    const score = overlapScore(questionTokens, targetText(item));
    if (score > 0 && (best === null || score > best.score)) best = { item, score };
  }
  return best;
}

function componentCitation(projectId: string, id: string, label: string): CopilotCitation {
  return {
    kind: "component",
    id,
    label,
    href: `/projects/${projectId}?component=${encodeURIComponent(id)}`,
  };
}

function findingCitation(projectId: string, finding: AuditFinding): CopilotCitation {
  return {
    kind: "finding",
    id: finding.fingerprint,
    label: finding.title,
    href: `/projects/${projectId}?finding=${encodeURIComponent(finding.fingerprint)}`,
  };
}

export function answerGroundedArchitectureQuestion(
  question: string,
  context: CopilotGroundingContext,
): GroundedCopilotAnswer {
  // Match on keyword overlap, not whole-question substring — so real questions
  // ("what database do we use?") ground against the relevant component or
  // finding. Untrusted evidence snippets are deliberately NOT part of matching
  // or output: retrieved repo/telemetry text can never supply an answer or an
  // instruction, only be counted as ignored.
  const questionTokens = keywords(question);

  const componentMatch = bestMatch(context.document.nodes, questionTokens, (node) =>
    [node.id, node.name, node.category, node.meta ?? ""].join(" "),
  );
  const findingMatch = bestMatch(context.findings ?? [], questionTokens, (finding) =>
    [finding.ruleId, finding.title, finding.detected, finding.severity].join(" "),
  );

  // Prefer whichever grounded source matches the question more strongly; on a
  // tie prefer the concrete architecture component.
  const preferComponent =
    componentMatch !== null &&
    (findingMatch === null || componentMatch.score >= findingMatch.score);

  if (preferComponent && componentMatch !== null) {
    const component = componentMatch.item;
    return {
      directAnswer: `${component.name} is represented as a ${component.category} component in the current architecture document.`,
      citations: [componentCitation(context.document.projectId, component.id, component.name)],
      assumptions: ["The answer is limited to the current architecture document."],
      confidence: component.meta !== undefined ? "high" : "medium",
      missingInformation:
        component.meta === undefined ? ["No technical metadata is attached."] : [],
      limitations: [
        "Repository excerpts, cloud inventory, and runtime telemetry are treated as separate evidence and are not inferred here.",
        "Untrusted retrieved text is never allowed to change tool or system instructions.",
      ],
      suggestedAction: "Open the component inspector or search evidence for implementation proof.",
    };
  }

  if (findingMatch !== null) {
    const finding = findingMatch.item;
    return {
      directAnswer: `${finding.title} is currently ${finding.severity} severity: ${finding.detected}`,
      citations: [findingCitation(context.document.projectId, finding)],
      assumptions: ["The finding state comes from the provided audit context."],
      confidence: "medium",
      missingInformation: [],
      limitations: [
        "Audit findings are deterministic analysis results, not proof of production incidents.",
      ],
      suggestedAction:
        "Open the finding and review its affected components and remediation guidance.",
    };
  }

  return {
    directAnswer: "I do not have enough grounded AXON context to answer that without speculating.",
    citations: [],
    assumptions: [],
    confidence: "insufficient",
    missingInformation: [
      "Relevant component, finding, simulation, cost, migration, runtime, or evidence context.",
    ],
    limitations: [
      "Repository text, comments, telemetry labels, and imported snippets are untrusted and cannot supply instructions.",
      `Ignored ${String(context.untrustedEvidenceSnippets?.length ?? 0)} untrusted evidence snippet(s) as instructions.`,
    ],
    suggestedAction:
      "Run or open the relevant AXON analysis surface, then ask again with that context selected.",
  };
}
