export type Confidence = "high" | "medium" | "low";

export type WarningSeverity = "info" | "review" | "unsupported";

/**
 * A structured, reviewable note about the import. Every unsupported or
 * unresolved Compose feature produces one of these rather than being silently
 * dropped.
 */
export interface ImportWarning {
  readonly code: string;
  readonly severity: WarningSeverity;
  /** Compose element the warning concerns, e.g. "services.api". */
  readonly target: string;
  /** What AXON detected, in reviewable language. */
  readonly message: string;
  /** Effect on import confidence. */
  readonly effect: string;
}

/** One detected port mapping on a service. */
export interface ComposePort {
  readonly published?: string;
  readonly target: string;
  readonly protocol?: string;
  readonly raw: string;
}

export type DependencySource = "depends_on" | "links";

export interface ComposeDependency {
  readonly from: string;
  readonly to: string;
  readonly source: DependencySource;
}

export interface ComposeService {
  readonly name: string;
  readonly image?: string;
  /** True when a build section is present (context is not inspected). */
  readonly hasBuild: boolean;
  readonly ports: readonly ComposePort[];
  readonly networks: readonly string[];
  /** Named volumes referenced (host mounts are reported separately). */
  readonly namedVolumes: readonly string[];
  readonly dependsOn: readonly string[];
  readonly links: readonly string[];
  /** Environment variable keys only — values are never resolved. */
  readonly environmentKeys: readonly string[];
  readonly restart?: string;
}

export interface ComposeResource {
  readonly name: string;
  readonly external: boolean;
}

/** The normalized, non-executing view of a supported Compose document. */
export interface ParsedComposeModel {
  readonly services: readonly ComposeService[];
  readonly networks: readonly ComposeResource[];
  readonly volumes: readonly ComposeResource[];
  readonly configs: readonly ComposeResource[];
  readonly secrets: readonly ComposeResource[];
  readonly dependencies: readonly ComposeDependency[];
  readonly composeVersion?: string;
}

/** A classified candidate architecture node, before AXON assigns storage ids. */
export interface CandidateNode {
  /** Deterministic slug derived from the service name. */
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly groupId?: string;
  readonly meta?: string;
  readonly classification: Confidence;
  /** Why this category was chosen. */
  readonly rationale: string;
}

export interface CandidateEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly kind: "sync" | "async" | "data" | "telemetry";
  readonly confidence: Confidence;
  readonly rationale: string;
}

export interface CandidateGroup {
  readonly id: string;
  readonly label: string;
}

export interface ArchitectureCandidate {
  readonly nodes: readonly CandidateNode[];
  readonly edges: readonly CandidateEdge[];
  readonly groups: readonly CandidateGroup[];
}

export interface ComposeImportResult {
  readonly importerVersion: string;
  readonly parsed: ParsedComposeModel;
  readonly candidate: ArchitectureCandidate;
  readonly warnings: readonly ImportWarning[];
}
