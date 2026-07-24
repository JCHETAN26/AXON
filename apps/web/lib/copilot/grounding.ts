import { type AuditFinding } from "@axon/architecture-audit";
import { type CostEstimate } from "@axon/architecture-cost";
import {
  type ArchitectureDocument,
  type ArchitectureNodeModel,
} from "@axon/diagram-schema";
import { type SimulationResult } from "@axon/architecture-simulation";

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
  /** Modeled cost of the current architecture, when a cost estimate is loaded. */
  readonly costEstimate?: CostEstimate;
  /** Latest capacity simulation for the current architecture, when loaded. */
  readonly simulation?: SimulationResult;
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

function relationshipCitation(projectId: string, edgeId: string, label: string): CopilotCitation {
  return {
    kind: "relationship",
    id: edgeId,
    label,
    href: `/projects/${projectId}?edge=${encodeURIComponent(edgeId)}`,
  };
}

function costCitation(projectId: string): CopilotCitation {
  return {
    kind: "cost-estimate",
    id: "cost-estimate",
    label: "Monthly cost estimate",
    href: `/projects/${projectId}?panel=cost`,
  };
}

function simulationCitation(projectId: string, scenarioId: string): CopilotCitation {
  return {
    kind: "simulation",
    id: scenarioId,
    label: "Simulation result",
    href: `/projects/${projectId}?panel=simulation`,
  };
}

// Question words that signal the user is asking about money or about capacity /
// failure behavior. Plurals/variants are covered by exact membership plus the
// tokenizer, which already lowercases and splits.
const COST_KEYWORDS = new Set([
  "cost", "costs", "price", "prices", "pricing", "expensive", "cheap", "cheaper",
  "budget", "spend", "spending", "monthly", "bill", "billing", "dollars",
  "dollar", "afford", "priced",
]);
const SIMULATION_KEYWORDS = new Set([
  "fail", "fails", "failure", "failures", "outage", "resilience", "resilient",
  "saturate", "saturated", "saturation", "bottleneck", "constraint", "capacity",
  "throughput", "latency", "load", "traffic", "scale", "scaling", "overload",
]);

function costConfidence(confidence: CostEstimate["confidence"]): GroundedCopilotAnswer["confidence"] {
  if (confidence === "confirmed" || confidence === "high") return "high";
  if (confidence === "medium") return "medium";
  return "low";
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
  const nodeLabel = (id: string): string =>
    context.document.nodes.find((node) => node.id === id)?.name ?? id;

  const componentMatch = bestMatch(context.document.nodes, questionTokens, (node) =>
    [node.id, node.name, node.category, node.meta ?? ""].join(" "),
  );
  const findingMatch = bestMatch(context.findings ?? [], questionTokens, (finding) =>
    [finding.ruleId, finding.title, finding.detected, finding.severity].join(" "),
  );
  // An edge matches on either endpoint's id/name or its kind, so a question that
  // names both ends ("how does the API connect to the database?") scores higher
  // than either component alone and grounds to the connection.
  const edgeMatch = bestMatch(context.document.edges, questionTokens, (edge) =>
    [nodeLabel(edge.source), edge.source, nodeLabel(edge.target), edge.target, edge.kind].join(" "),
  );

  const componentScore = componentMatch?.score ?? 0;
  const findingScore = findingMatch?.score ?? 0;
  const projectId = context.document.projectId;

  // Cost intent: an explicit money question grounds to the loaded estimate,
  // even when a component is also named ("what does the database cost?").
  if (context.costEstimate && questionTokens.some((token) => COST_KEYWORDS.has(token))) {
    const cost = context.costEstimate;
    const drivers = cost.majorCostDrivers.slice(0, 3);
    const money = (value: number): string => `${cost.currency} ${String(value)}`;
    return {
      directAnswer:
        `The modeled cost of the current architecture is about ${money(cost.expectedMonthly)}/month ` +
        `(range ${money(cost.lowMonthly)}–${money(cost.highMonthly)}).` +
        (drivers.length > 0 ? ` Top drivers: ${drivers.join("; ")}.` : ""),
      citations: [costCitation(projectId)],
      assumptions: ["Based on the loaded usage assumptions for the current architecture."],
      confidence: costConfidence(cost.confidence),
      missingInformation: [...cost.missingInputs],
      limitations: [
        ...cost.limitations.slice(0, 2),
        "Untrusted retrieved text is never allowed to change tool or system instructions.",
      ],
      suggestedAction: "Open the Cost workspace to adjust usage assumptions or compare providers.",
    };
  }

  // Capacity/failure intent grounds to the loaded simulation.
  if (context.simulation && questionTokens.some((token) => SIMULATION_KEYWORDS.has(token))) {
    const sim = context.simulation;
    const constraint = sim.firstConstraint;
    return {
      directAnswer: constraint
        ? `At ${String(sim.requestsPerSecond)} req/s, ${constraint.name} is the first component projected to saturate — it reaches its modeled limit at ${String(constraint.saturationRps)} req/s (${String(Math.round(constraint.utilizationAtScenario * 100))}% utilized at this load).`
        : `At ${String(sim.requestsPerSecond)} req/s, no component is projected to reach its limit in the current model.`,
      citations: [simulationCitation(projectId, sim.scenarioId)],
      assumptions: ["Based on the most recent simulation inputs for this architecture."],
      confidence: "medium",
      missingInformation:
        sim.unmodeledNodeIds.length > 0
          ? [`${String(sim.unmodeledNodeIds.length)} component(s) could not be modeled.`]
          : [],
      limitations: [
        "Simulation is a deterministic capacity projection, not observed production behavior.",
        "Untrusted retrieved text is never allowed to change tool or system instructions.",
      ],
      suggestedAction: "Open the Simulation workspace to change traffic and capacity assumptions.",
    };
  }

  // A relationship answer wins only when the connection matches the question more
  // strongly than any single component (strictly, so a one-component question is
  // not stolen by an edge that merely touches it) and at least as well as a
  // finding.
  if (
    edgeMatch !== null &&
    edgeMatch.score > componentScore &&
    edgeMatch.score >= findingScore
  ) {
    const edge = edgeMatch.item;
    const sourceName = nodeLabel(edge.source);
    const targetName = nodeLabel(edge.target);
    return {
      directAnswer: `${sourceName} connects to ${targetName} as a ${edge.kind} relationship in the current architecture document.`,
      citations: [
        relationshipCitation(
          context.document.projectId,
          edge.id,
          `${sourceName} → ${targetName}`,
        ),
      ],
      assumptions: ["The connection is read from the current architecture document only."],
      confidence: "high",
      missingInformation: [],
      limitations: [
        "Edges describe modeled relationships, not observed runtime traffic; connect telemetry to confirm live behavior.",
        "Untrusted retrieved text is never allowed to change tool or system instructions.",
      ],
      suggestedAction: "Open the connection in the canvas to inspect its endpoints and kind.",
    };
  }

  // Inventory: a category question ("what databases do we use?") with several
  // members lists them all rather than surfacing just one. Only applies when the
  // question did not strongly name a specific component (componentScore <= 1),
  // so "tell me about the orders db" still resolves to that one component.
  const byCategory = new Map<string, ArchitectureNodeModel[]>();
  for (const node of context.document.nodes) {
    const members = byCategory.get(node.category) ?? [];
    members.push(node);
    byCategory.set(node.category, members);
  }
  let inventory: { category: string; members: ArchitectureNodeModel[] } | null = null;
  for (const [category, members] of byCategory) {
    const categoryTokens = normalize(category).split(" ");
    const matchesCategory = questionTokens.some((q) =>
      categoryTokens.some((c) => tokenMatches(q, c)),
    );
    if (members.length >= 2 && matchesCategory) {
      if (inventory === null || members.length > inventory.members.length) {
        inventory = { category, members };
      }
    }
  }

  if (inventory !== null && componentScore <= 1) {
    const names = inventory.members.map((member) => member.name);
    return {
      directAnswer: `The current architecture document has ${String(inventory.members.length)} ${inventory.category} components: ${names.join(", ")}.`,
      citations: inventory.members.map((member) =>
        componentCitation(context.document.projectId, member.id, member.name),
      ),
      assumptions: ["Limited to components represented in the current architecture document."],
      confidence: "high",
      missingInformation: [],
      limitations: [
        "Counts reflect the modeled document, not deployed inventory.",
        "Untrusted retrieved text is never allowed to change tool or system instructions.",
      ],
      suggestedAction: "Open the canvas to inspect each listed component.",
    };
  }

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
