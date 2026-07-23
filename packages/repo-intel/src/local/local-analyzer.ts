import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { createHash } from "node:crypto";

import { classifyFile } from "../classify-files";
import { extractEvidence } from "../extractors/index";
import { buildProposal } from "../proposal";
import { type RepositoryEvidence, type ArchitectureProposal } from "../schemas";
import { type WorkspaceBoundary, type WorkspaceInventory } from "./workspace-boundary";

export interface LocalAnalysisConfig {
  /** Workspace boundary controlling security and limits. */
  boundary: WorkspaceBoundary;
  /** Optional AbortSignal for cancellation. */
  signal?: AbortSignal;
}

export interface LocalAnalysisResult {
  /** The generated architecture proposal. */
  proposal: ArchitectureProposal;
  /** All evidence records extracted from local files. */
  evidence: RepositoryEvidence[];
  /** Workspace inventory metadata. */
  inventory: WorkspaceInventory;
  /** File hashes for cache-invalidation. */
  fileHashes: Map<string, string>;
  /** Duration in milliseconds. */
  durationMs: number;
  /** Analysis provenance. */
  provenance: "locally-observed";
}

/**
 * Orchestrates local repository analysis using existing extractors.
 * All analysis happens locally — no network calls are made.
 */
export class LocalAnalyzer {
  private readonly boundary: WorkspaceBoundary;

  constructor(config: LocalAnalysisConfig) {
    this.boundary = config.boundary;
  }

  async analyze(signal?: AbortSignal): Promise<LocalAnalysisResult> {
    const start = Date.now();

    // Step 1: Inventory files within boundary
    const inventory = await this.boundary.inventory();

    this.checkCancellation(signal);

    // Step 2: Classify each file; keep only supported ones with their extractor.
    const supportedFiles: { path: string; absolutePath: string; extractor: ReturnType<typeof classifyFile> }[] =
      [];
    for (const file of inventory.files) {
      const classification = classifyFile(file.relativePath);
      if (classification.supported) {
        supportedFiles.push({
          path: file.relativePath,
          absolutePath: file.absolutePath,
          extractor: classification,
        });
      }
    }

    this.checkCancellation(signal);

    // Step 3: Read supported file contents (env-scrubbed) and hash them.
    const fileHashes = new Map<string, string>();
    const fileContents = new Map<string, string>();

    for (const file of supportedFiles) {
      this.checkCancellation(signal);
      try {
        let content = await readFile(file.absolutePath, "utf-8");
        if (this.boundary.isEnvFile(basename(file.path))) {
          content = this.boundary.scrubEnvValues(content);
        }
        const hash = createHash("sha256").update(content).digest("hex");
        fileHashes.set(file.path, hash);
        fileContents.set(file.path, content);
      } catch {
        continue; // Skip unreadable files
      }
    }

    this.checkCancellation(signal);

    // Step 4: Extract evidence, assigning stable ids to each raw record.
    const allEvidence: RepositoryEvidence[] = [];
    for (const file of supportedFiles) {
      this.checkCancellation(signal);
      if (allEvidence.length >= this.boundary.limits.maxEvidenceCount) break;

      const content = fileContents.get(file.path);
      if (content === undefined || !file.extractor.supported) continue;

      try {
        const raw = extractEvidence(file.path, file.extractor.extractor, content);
        for (const record of raw) {
          if (allEvidence.length >= this.boundary.limits.maxEvidenceCount) break;
          allEvidence.push({ ...record, id: `${file.path}#${String(allEvidence.length)}` });
        }
      } catch {
        continue; // Skip files that fail extraction
      }
    }

    this.checkCancellation(signal);

    // Step 5: Build proposal from evidence
    const proposal = buildProposal(`local://${this.boundary.rootDir}`, "local", allEvidence);

    const durationMs = Date.now() - start;

    return {
      proposal,
      evidence: allEvidence,
      inventory,
      fileHashes,
      durationMs,
      provenance: "locally-observed",
    };
  }

  private checkCancellation(signal?: AbortSignal): void {
    if (signal?.aborted) {
      throw new LocalAnalysisCancelledError("Local analysis was cancelled");
    }
  }
}

export class LocalAnalysisCancelledError extends Error {
  readonly code = "ANALYSIS_CANCELLED";
  constructor(message: string) {
    super(message);
    this.name = "LocalAnalysisCancelledError";
  }
}
