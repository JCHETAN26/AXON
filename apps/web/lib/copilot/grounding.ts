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
  const normalizedQuestion = normalize(question);
  const matchingComponents = context.document.nodes.filter((node) =>
    normalize([node.id, node.name, node.category, node.meta ?? ""].join(" ")).includes(
      normalizedQuestion,
    ),
  );
  const matchingFindings =
    context.findings?.filter((finding) =>
      normalize(
        [
          finding.fingerprint,
          finding.ruleId,
          finding.title,
          finding.detected,
          finding.severity,
        ].join(" "),
      ).includes(normalizedQuestion),
    ) ?? [];

  if (matchingComponents.length > 0) {
    const component = matchingComponents[0];
    if (component === undefined) throw new Error("Matched component unexpectedly missing.");
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

  if (matchingFindings.length > 0) {
    const finding = matchingFindings[0];
    if (finding === undefined) throw new Error("Matched finding unexpectedly missing.");
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
