import {
  estimateArchitectureCost,
  estimateArchitectureCostAtScale,
  type CostEstimate,
  type Provider,
  type ScaleFactor,
  type UsageDriver,
  type UsageProfile,
} from "@axon/architecture-cost";
import { type ArchitectureDocument } from "@axon/diagram-schema";
import { and, desc, eq, sql } from "drizzle-orm";

import { type Database } from "../db/client";
import { costEstimateRuns, costUsageAssumptions, documents, projects } from "../db/schema";

export interface CostEstimateRunResult {
  readonly runId: string;
  readonly baseline: CostEstimate;
  readonly scaleProjections: Record<ScaleFactor, CostEstimate> | null;
}

export interface StoredCostEstimateSummary {
  readonly id: string;
  readonly projectId: string;
  readonly provider: string;
  readonly region: string;
  readonly pricingCatalogVersion: string;
  readonly pricingEffectiveDate: string;
  readonly expectedMonthly: number;
  readonly confidence: string;
  readonly createdAt: Date;
}

export class CostService {
  constructor(
    private readonly db: Database,
    private readonly ownerId: string,
  ) {}

  async listUsageAssumptions(projectId: string): Promise<UsageDriver[]> {
    const exists = await this.projectExists(projectId);
    if (!exists) return [];

    const rows = await this.db
      .select()
      .from(costUsageAssumptions)
      .where(
        and(
          eq(costUsageAssumptions.ownerId, this.ownerId),
          eq(costUsageAssumptions.projectId, projectId),
        ),
      )
      .orderBy(costUsageAssumptions.componentId, costUsageAssumptions.unit);

    return rows.map((row) => ({
      id: row.id,
      componentId: row.componentId,
      unit: row.unit as UsageDriver["unit"],
      value: row.value,
      source: row.source as UsageDriver["source"],
      timeWindow: row.timeWindow as UsageDriver["timeWindow"],
      confidence: row.confidence as UsageDriver["confidence"],
      derivation: row.derivation,
      userOverride: row.userOverride,
      ...(row.observedAt ? { observedAt: row.observedAt.toISOString() } : {}),
    }));
  }

  async upsertUsageAssumptions(projectId: string, drivers: readonly UsageDriver[]): Promise<void> {
    const exists = await this.projectExists(projectId);
    if (!exists) throw new Error("Project not found");
    if (drivers.length === 0) return;

    await this.db
      .insert(costUsageAssumptions)
      .values(
        drivers.map((driver) => ({
          ownerId: this.ownerId,
          projectId,
          componentId: driver.componentId,
          unit: driver.unit,
          value: driver.value,
          source: driver.source,
          timeWindow: driver.timeWindow,
          confidence: driver.confidence,
          derivation: driver.derivation,
          userOverride: driver.userOverride,
          observedAt: driver.observedAt ? new Date(driver.observedAt) : null,
          updatedAt: new Date(),
        })),
      )
      .onConflictDoUpdate({
        target: [
          costUsageAssumptions.ownerId,
          costUsageAssumptions.projectId,
          costUsageAssumptions.componentId,
          costUsageAssumptions.unit,
        ],
        set: {
          value: sql`excluded.value`,
          source: sql`excluded.source`,
          timeWindow: sql`excluded.time_window`,
          confidence: sql`excluded.confidence`,
          derivation: sql`excluded.derivation`,
          userOverride: sql`excluded.user_override`,
          observedAt: sql`excluded.observed_at`,
          updatedAt: new Date(),
        },
      });
  }

  async createEstimateRun(input: {
    readonly projectId: string;
    readonly provider: Provider;
    readonly region: string;
    readonly usageDrivers?: readonly UsageDriver[];
    readonly persistUsageAssumptions?: boolean;
    readonly includeScaleProjections?: boolean;
  }): Promise<CostEstimateRunResult | null> {
    const project = await this.loadProjectDocument(input.projectId);
    if (project === null) return null;

    if (input.usageDrivers !== undefined && input.persistUsageAssumptions !== false) {
      await this.upsertUsageAssumptions(input.projectId, input.usageDrivers);
    }
    const usageProfile: UsageProfile = {
      drivers: input.usageDrivers
        ? [...input.usageDrivers]
        : await this.listUsageAssumptions(input.projectId),
    };
    const baseline = estimateArchitectureCost({
      document: project.document,
      provider: input.provider,
      region: input.region,
      usageProfile,
    });
    const scaleProjections =
      input.includeScaleProjections === false
        ? null
        : estimateArchitectureCostAtScale({
            document: project.document,
            provider: input.provider,
            region: input.region,
            usageProfile,
          });

    const inserted = await this.db
      .insert(costEstimateRuns)
      .values({
        ownerId: this.ownerId,
        projectId: input.projectId,
        provider: input.provider,
        region: input.region,
        modelVersion: baseline.modelVersion,
        pricingCatalogVersion: baseline.pricingCatalogVersion,
        pricingEffectiveDate: baseline.pricingEffectiveDate,
        usageProfile,
        baselineEstimate: baseline,
        scaleProjections,
        lowMonthly: baseline.lowMonthly,
        expectedMonthly: baseline.expectedMonthly,
        highMonthly: baseline.highMonthly,
        confidence: baseline.confidence,
      })
      .returning({ id: costEstimateRuns.id });

    const runId = inserted[0]?.id;
    if (!runId) throw new Error("Failed to persist cost estimate run");
    return { runId, baseline, scaleProjections };
  }

  async listEstimateRuns(projectId: string): Promise<StoredCostEstimateSummary[]> {
    const exists = await this.projectExists(projectId);
    if (!exists) return [];

    const rows = await this.db
      .select({
        id: costEstimateRuns.id,
        projectId: costEstimateRuns.projectId,
        provider: costEstimateRuns.provider,
        region: costEstimateRuns.region,
        pricingCatalogVersion: costEstimateRuns.pricingCatalogVersion,
        pricingEffectiveDate: costEstimateRuns.pricingEffectiveDate,
        expectedMonthly: costEstimateRuns.expectedMonthly,
        confidence: costEstimateRuns.confidence,
        createdAt: costEstimateRuns.createdAt,
      })
      .from(costEstimateRuns)
      .where(
        and(eq(costEstimateRuns.ownerId, this.ownerId), eq(costEstimateRuns.projectId, projectId)),
      )
      .orderBy(desc(costEstimateRuns.createdAt));

    return rows;
  }

  private async projectExists(projectId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.ownerId, this.ownerId)))
      .limit(1);
    return rows[0] !== undefined;
  }

  private async loadProjectDocument(projectId: string) {
    const rows = await this.db
      .select({ document: documents.document })
      .from(documents)
      .where(and(eq(documents.projectId, projectId), eq(documents.ownerId, this.ownerId)))
      .limit(1);
    const row = rows[0];
    if (row === undefined) return null;
    return { document: row.document as ArchitectureDocument };
  }
}
