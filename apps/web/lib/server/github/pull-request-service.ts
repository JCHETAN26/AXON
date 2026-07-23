import { and, eq, desc } from "drizzle-orm";
import { type ArchitectureProposal } from "@axon/repo-intel";

import { type Database } from "../db/client";
import { 
  connectedRepositories, 
  githubInstallations, 
  githubPrAnalysisRuns, 
  architectureProposals 
} from "../db/schema";
import { type GithubGateway } from "./gateway";
import { 
  generatePrReviewMarkdown, 
  type ArchitectureRisk, 
  type PrImpactSummary 
} from "./pr-comment-generator";

export class PullRequestService {
  constructor(
    private readonly db: Database,
    private readonly gateway: GithubGateway,
    private readonly ownerId: string
  ) {}

  async listPullRequestRuns(repositoryConnectionId: string) {
    return this.db
      .select()
      .from(githubPrAnalysisRuns)
      .where(
        and(
          eq(githubPrAnalysisRuns.repositoryConnectionId, repositoryConnectionId),
          eq(githubPrAnalysisRuns.ownerId, this.ownerId)
        )
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
        eq(connectedRepositories.installationConnectionId, githubInstallations.id)
      )
      .where(
        and(
          eq(connectedRepositories.id, repositoryConnectionId),
          eq(connectedRepositories.ownerId, this.ownerId)
        )
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
      "all"
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
      prNumber
    );

    // Calculate Architecture Risk
    let risk: ArchitectureRisk = "none";
    let hasIac = false;
    let hasManifests = false;

    for (const f of files) {
      if (
        f.filename.endsWith(".tf") ||
        f.filename.endsWith(".hcl") ||
        f.filename.includes("k8s/") ||
        f.filename.endsWith(".yaml")
      ) {
        hasIac = true;
      }
      if (
        f.filename.endsWith("package.json") ||
        f.filename.endsWith("go.mod") ||
        f.filename.endsWith("requirements.txt") ||
        f.filename.endsWith("docker-compose.yml")
      ) {
        hasManifests = true;
      }
    }

    if (hasIac) {
      risk = "high";
    } else if (hasManifests) {
      risk = "medium";
    } else if (files.length > 0) {
      risk = "low";
    }

    // Build PR Architecture Proposal
    const proposal: ArchitectureProposal = {
      schemaVersion: "1.0",
      sourceRepositoryFullName: repo.fullName,
      sourceCommitSha: headSha,
      components: [],
      relationships: [],
      conflicts: [],
      unresolved: [],
      createdAt: new Date().toISOString(),
    };

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
      addedComponentsCount: 0,
      removedComponentsCount: 0,
      modifiedComponentsCount: 0,
      conflictsCount: 0,
      unresolvedCount: 0,
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
    const repoRows = await this.db
      .select({
        repo: connectedRepositories,
        installation: githubInstallations,
      })
      .from(connectedRepositories)
      .innerJoin(
        githubInstallations,
        eq(connectedRepositories.installationConnectionId, githubInstallations.id)
      )
      .where(
        and(
          eq(connectedRepositories.id, repositoryConnectionId),
          eq(connectedRepositories.ownerId, this.ownerId)
        )
      )
      .limit(1);

    const match = repoRows[0];
    if (!match) throw new Error("Connected repository not found");

    const { repo, installation } = match;

    const runRows = await this.db
      .select()
      .from(githubPrAnalysisRuns)
      .where(
        and(
          eq(githubPrAnalysisRuns.id, runId),
          eq(githubPrAnalysisRuns.ownerId, this.ownerId)
        )
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
      body
    );

    await this.db
      .update(githubPrAnalysisRuns)
      .set({ commentPostedAt: new Date() })
      .where(eq(githubPrAnalysisRuns.id, runId));
  }
}
