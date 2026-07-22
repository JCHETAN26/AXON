export { classifyService, type Classification, type ServiceRole } from "./classify";
export { convertToCandidate, slugify } from "./convert";
export { ComposeImportError, type ImportErrorCode } from "./errors";
export {
  IMPORT_DISCLAIMER,
  IMPORTER_VERSION,
  importCompose,
  type ImportOptions,
} from "./import-compose";
export { IMPORT_LIMITS, type ImportLimits } from "./limits";
export { normalizeCompose } from "./normalize";
export { parseComposeYaml } from "./parse-yaml";
export {
  type ArchitectureCandidate,
  type CandidateEdge,
  type CandidateGroup,
  type CandidateNode,
  type ComposeDependency,
  type ComposeImportResult,
  type ComposePort,
  type ComposeResource,
  type ComposeService,
  type Confidence,
  type ImportWarning,
  type ParsedComposeModel,
  type WarningSeverity,
} from "./types";
export { sortWarnings } from "./warnings";
