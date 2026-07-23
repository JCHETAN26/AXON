import { and, eq, desc } from "drizzle-orm";
import {
  buildProposal,
  classifyFile,
  DEFAULT_ANALYSIS_LIMITS,
  extractEvidence,
  type ArchitectureProposal,
  type RepositoryEvidence,
} from "@axon/repo-intel";

import { type Database } from "../db/client";
import {
  connectedRepositories,
  githubInstallations,
  githubPrAnalysisRuns,
  architectureProposals,
} from "../db/schema";
import { isGithubPrOutputEnabled } from "./config";
import { type GithubGateway } from "./gateway";
import {
  generatePrReviewMarkdown,
  type ArchitectureRisk,
  type PrImpactSummary,
} from "./pr-comment-generator";

/** Raised when GitHub write-back is attempted while disabled (the default). */
export class PrOutputDisabledError extends Error {
  constructor() {
    super(
      "GitHub PR output is disabled. Set AXON_GITHUB_PR_OUTPUT_ENABLED=true and grant the App write permission.",
    );
    this.name = "PrOutputDisabledError";
  }
}

export class PullRequestService {
  constructor(
    private readonly db: Database,
    private readonly gateway: GithubGateway,
    private readonly ownerId: string,
  ) {}

  async listPullRequestRuns(repositoryConnectionId: string) {
    return this.db
      .select()
      .from(githubPrAnalysisRuns)
      .where(
        and(
          eq(githubPrAnalysisRuns.repositoryConnectionId, repositoryConnectionId),
          eq(githubPrAnalysisRuns.ownerId, this.ownerId),
        ),
      )
      .orderBy(desc(githubPrAnalysisRuns.createdAt));
  }

  async analyzePullRequest(repositoryConnectionId: string, prNumber: number) {
    // Fetch repository & installation details
    const repoRows = await this.db
      .select({
        repo: connectedRepositories,
        installation: githubInstallations,
      })
      .from(connectedRepositories)
      .innerJoin(
        githubInstallations,
        eq(connectedRepositories.installationConnectionId, githubInstallations.id),
      )
      .where(
        and(
          eq(connectedRepositories.id, repositoryConnectionId),
          eq(connectedRepositories.ownerId, this.ownerId),
        ),
      )
      .limit(1);

    const match = repoRows[0];
    if (!match) throw new Error("Connected repository not found");

    const { repo, installation } = match;

    // Fetch PR info & files from GitHub App gateway
    const prList = await this.gateway.listPullRequests(
      installation.installationId,
      repo.ownerLogin,
      repo.name,
      "all",
    );

    const prInfo = prList.find((p) => p.number === prNumber);
    const prTitle = prInfo?.title ?? `Pull Request #${prNumber}`;
    const prAuthor = prInfo?.author ?? "unknown";
    const headSha = prInfo?.headSha ?? "head-sha";
    const baseSha = prInfo?.baseSha ?? "base-sha";

    const files = await this.gateway.getPullRequestFiles(
      installation.installationId,
      repo.ownerLogin,
      repo.name,
      prNumber,
    );

    // Analyze the changed files: fetch each supported, non-removed file at the
    // head commit, run the deterministic extractors, and build an evidence-backed
    // proposal. Every component/relationship therefore references changed
    // evidence (real file paths + extracted facts), not a file extension guess.
    const evidence: RepositoryEvidence[] = [];
    let examined = 0;
    let hasInfrastructure = false;
    const MAX_CHANGED_FILES = 50;

    for (const f of files) {
      if (evidence.length >= DEFAULT_ANALYSIS_LIMITS.maxEvidence || examined >= MAX_CHANGED_FILES) {
        break;
      }
      if (f.status === "removed") continue;
      const classification = classifyFile(f.filename);
      if (!classification.supported) continue;

      let content: string;
      try {
        content = await this.gateway.getFileText(
          installation.installationId,
          repo.ownerLogin,
          repo.name,
          f.filename,
          headSha,
          DEFAULT_ANALYSIS_LIMITS.maxFileBytes,
        );
      } catch {
        continue; // too large / unavailable — skip safely
      }
      examined += 1;

      const raw = extractEvidence(f.filename, classification.extractor, content);
      for (const record of raw) {
        if (evidence.length >= DEFAULT_ANALYSIS_LIMITS.maxEvidence) break;
        if (record.evidenceType === "infrastructure-declaration") hasInfrastructure = true;
        evidence.push({ ...record, id: `${f.filename}#${String(evidence.length)}` });
      }
    }

    const proposal: ArchitectureProposal = buildProposal(repo.fullName, headSha, evidence);

    // Risk derives from what actually changed (evidence), not file extensions.
    const risk: ArchitectureRisk = hasInfrastructure
      ? "high"
      : proposal.components.length > 0
        ? "medium"
        : examined > 0
          ? "low"
          : "none";

    const insertedProposal = await this.db
      .insert(architectureProposals)
      .values({
        ownerId: this.ownerId,
        repositoryConnectionId,
        sourceCommitSha: headSha,
        status: "draft",
        proposal,
      })
      .returning({ id: architectureProposals.id });

    const proposalId = insertedProposal[0]?.id;

    const summary: PrImpactSummary = {
      risk,
      addedComponentsCount: proposal.components.length,
      removedComponentsCount: 0,
      modifiedComponentsCount: proposal.relationships.length,
      conflictsCount: proposal.conflicts.length,
      unresolvedCount: proposal.unresolved.length,
      changedFilesCount: files.length,
    };

    const insertedRun = await this.db
      .insert(githubPrAnalysisRuns)
      .values({
        ownerId: this.ownerId,
        repositoryConnectionId,
        prNumber,
        prTitle,
        prAuthor,
        headSha,
        baseSha,
        status: "completed",
        architectureRisk: risk,
        proposalId,
        impactSummary: summary,
      })
      .returning({ id: githubPrAnalysisRuns.id });

    const runId = insertedRun[0]?.id;
    if (!runId) throw new Error("Failed to create PR analysis run");

    return { runId, summary, proposal };
  }

  async postPrReviewComment(repositoryConnectionId: string, prNumber: number, runId: string) {
    // Writing back to GitHub is gated: off by default, and requires a GitHub App
    // permission upgrade. In-product review never depends on this.
    if (!isGithubPrOutputEnabled()) {
      throw new PrOutputDisabledError();
    }

    const repoRows = await this.db
      .select({
        repo: connectedRepositories,
        installation: githubInstallations,
      })
      .from(connectedRepositories)
      .innerJoin(
        githubInstallations,
        eq(connectedRepositories.installationConnectionId, githubInstallations.id),
      )
      .where(
        and(
          eq(connectedRepositories.id, repositoryConnectionId),
          eq(connectedRepositories.ownerId, this.ownerId),
        ),
      )
      .limit(1);

    const match = repoRows[0];
    if (!match) throw new Error("Connected repository not found");

    const { repo, installation } = match;

    const runRows = await this.db
      .select()
      .from(githubPrAnalysisRuns)
      .where(
        and(eq(githubPrAnalysisRuns.id, runId), eq(githubPrAnalysisRuns.ownerId, this.ownerId)),
      )
      .limit(1);

    const run = runRows[0];
    if (!run) throw new Error("PR analysis run not found");

    let proposal: ArchitectureProposal = {
      schemaVersion: "1.0",
      sourceRepositoryFullName: repo.fullName,
      sourceCommitSha: run.headSha,
      components: [],
      relationships: [],
      conflicts: [],
      unresolved: [],
      createdAt: new Date().toISOString(),
    };

    if (run.proposalId) {
      const propRows = await this.db
        .select()
        .from(architectureProposals)
        .where(eq(architectureProposals.id, run.proposalId))
        .limit(1);

      if (propRows[0]) {
        proposal = propRows[0].proposal as unknown as ArchitectureProposal;
      }
    }

    const summary = run.impactSummary as unknown as PrImpactSummary;
    const body = generatePrReviewMarkdown(prNumber, run.prTitle, run.headSha, summary, proposal);

    await this.gateway.postPullRequestComment(
      installation.installationId,
      repo.ownerLogin,
      repo.name,
      prNumber,
      body,
    );

    await this.db
      .update(githubPrAnalysisRuns)
      .set({ commentPostedAt: new Date() })
      .where(eq(githubPrAnalysisRuns.id, runId));
  }
}
