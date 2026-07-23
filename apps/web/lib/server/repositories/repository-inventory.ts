import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { 
  type ExtractorId, 
  classifyFile, 
  extractEvidence, 
  buildProposal, 
  DEFAULT_ANALYSIS_LIMITS,
  type RepositoryEvidence
} from "@axon/repo-intel";

import { type Database } from "../db/client";
import { 
  connectedRepositories, 
  repositoryAnalysisRuns, 
  repositoryEvidence,
  architectureProposals,
} from "../db/schema";
import type { GithubGateway, RemoteTreeEntry } from "../github/gateway";
import type { ServerGithubRepository } from "./server-github-repository";

export class RepositoryInventoryService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
    private readonly githubGateway: GithubGateway,
    private readonly githubRepo: ServerGithubRepository
  ) {}

  async runAnalysis(
    repositoryConnectionId: string,
    requestedByUserId: string,
    forceReanalyze = false
  ): Promise<string> { // returns analysisRunId
    // 1. Get repository and installation
    const repo = await this.githubRepo.getRepository(repositoryConnectionId);
    if (!repo) throw new Error("Repository not found or access denied.");
    
    const install = await this.githubRepo.getInstallation(repo.installationConnectionId);
    if (!install) throw new Error("Installation not found.");

    // 2. Resolve head SHA
    const commitSha = await this.githubGateway.getBranchHeadSha(
      install.installationId,
      repo.ownerLogin,
      repo.name,
      repo.defaultBranch
    );

    // 3. Check staleness
    if (!forceReanalyze && repo.lastAnalyzedSha === commitSha) {
      // Check if there's already a successful run for this SHA
      const existingRuns = await this.db.select().from(repositoryAnalysisRuns)
        .where(and(
          eq(repositoryAnalysisRuns.repositoryConnectionId, repo.id),
          eq(repositoryAnalysisRuns.commitSha, commitSha),
          eq(repositoryAnalysisRuns.status, "succeeded")
        )).limit(1);
        
      const firstRun = existingRuns[0];
      if (firstRun) {
        return firstRun.id;
      }
    }

    // 4. Create Run
    const runId = randomUUID();
    const now = new Date();
    
    await this.db.insert(repositoryAnalysisRuns).values({
      id: runId,
      ownerId: this.ownerId,
      repositoryConnectionId: repo.id,
      requestedByUserId,
      commitSha,
      status: "running",
      startedAt: now,
    });

    try {
      // 5. Fetch Tree
      const tree = await this.githubGateway.getTree(
        install.installationId,
        repo.ownerLogin,
        repo.name,
        commitSha
      );

      // 6. Classify files
      const limits = DEFAULT_ANALYSIS_LIMITS;
      const supportedEntries: { entry: RemoteTreeEntry, extractor: ExtractorId }[] = [];
      let skippedCount = 0;
      let aggregateBytes = 0;

      for (const entry of tree.entries) {
        if (entry.type !== "blob" || entry.special) {
          continue;
        }

        const classification = classifyFile(entry.path, limits.maxPathLength);
        if (classification.supported) {
          const size = entry.size ?? 0;
          if (size <= limits.maxFileBytes && aggregateBytes + size <= limits.maxAggregateBytes && supportedEntries.length < limits.maxFilesExamined) {
            supportedEntries.push({ entry, extractor: classification.extractor });
            aggregateBytes += size;
          } else {
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      }

      // 7. Extract Evidence
      // Bounded concurrency
      const concurrency = 5;
      const evidenceList: (typeof repositoryEvidence.$inferInsert)[] = [];
      
      for (let i = 0; i < supportedEntries.length; i += concurrency) {
        const batch = supportedEntries.slice(i, i + concurrency);
        const promises = batch.map(async ({ entry, extractor }) => {
          try {
            const text = await this.githubGateway.getFileText(
              install.installationId,
              repo.ownerLogin,
              repo.name,
              entry.path,
              commitSha,
              limits.maxFileBytes
            );
            
            const extracted = extractEvidence(entry.path, extractor, text);
            return extracted.map(e => ({
              id: randomUUID(),
              ownerId: this.ownerId,
              analysisRunId: runId,
              repositoryConnectionId: repo.id,
              commitSha,
              filePath: e.filePath,
              startLine: e.startLine,
              endLine: e.endLine,
              evidenceType: e.evidenceType,
              extractor: e.extractor,
              excerpt: e.excerpt,
              fact: e.fact,
              confidence: e.confidence,
            }));
          } catch {
            // ignore fetch failures for individual files
            return [];
          }
        });
        
        const results = await Promise.all(promises);
        for (const res of results) {
          evidenceList.push(...res);
        }
      }

      // Enforce max evidence limit
      const finalEvidence = evidenceList.slice(0, limits.maxEvidence);
      
      if (finalEvidence.length > 0) {
        await this.db.insert(repositoryEvidence).values(finalEvidence);
      }

      // 8. Build Proposal
      const proposalObj = buildProposal(
        repo.fullName, 
        commitSha, 
        finalEvidence as unknown as RepositoryEvidence[]
      );
      const proposalId = randomUUID();
      
      await this.db.insert(architectureProposals).values({
        id: proposalId,
        ownerId: this.ownerId,
        repositoryConnectionId: repo.id,
        analysisRunId: runId,
        sourceCommitSha: commitSha,
        status: "draft",
        proposal: proposalObj,
      });

      // 9. Mark Complete
      await this.db.update(repositoryAnalysisRuns).set({
        status: "succeeded",
        completedAt: new Date(),
        supportedFileCount: supportedEntries.length,
        skippedFileCount: skippedCount,
        evidenceCount: finalEvidence.length,
        proposalId,
      }).where(eq(repositoryAnalysisRuns.id, runId));

      await this.db.update(connectedRepositories).set({
        lastAnalyzedSha: commitSha,
        lastSyncStatus: "success",
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(connectedRepositories.id, repo.id));

      return runId;

    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      await this.db.update(repositoryAnalysisRuns).set({
        status: "failed",
        completedAt: new Date(),
        failureCode: err.code || "unknown",
        failureSummary: err.message?.substring(0, 200),
      }).where(eq(repositoryAnalysisRuns.id, runId));
      
      await this.db.update(connectedRepositories).set({
        lastSyncStatus: "failed",
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(connectedRepositories.id, repo.id));
      
      throw e;
    }
  }
}
