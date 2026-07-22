import { and, eq } from "drizzle-orm";

import { type Database } from "../db/client";
import {
  artifacts,
  betaAccess,
  documents,
  feedback,
  generationUsage,
  projects,
  users,
} from "../db/schema";
import { assembleProjectExport, type ProjectExportInput } from "./build-project-export";
import {
  ACCOUNT_EXPORT_DISCLAIMER,
  EXPORT_SCHEMA_VERSION,
  type AxonAccountExport,
  type AxonProjectExport,
} from "./export-types";

/** Maximum projects exportable synchronously; larger accounts are told the limit. */
export const ACCOUNT_EXPORT_PROJECT_LIMIT = 200;

async function collectArtifacts(
  db: Database,
  ownerId: string,
  projectId: string,
): Promise<ProjectExportInput["artifacts"]> {
  const rows = await db
    .select({ kind: artifacts.kind, payload: artifacts.payload })
    .from(artifacts)
    .where(and(eq(artifacts.projectId, projectId), eq(artifacts.ownerId, ownerId)));
  const map: ProjectExportInput["artifacts"] = {};
  for (const row of rows) {
    if (row.kind === "audit") map.audit = row.payload;
    else if (row.kind === "recommendation") map.recommendation = row.payload;
    else if (row.kind === "simulation") map.simulation = row.payload;
    else if (row.kind === "import") map.import = row.payload;
  }
  return map;
}

/**
 * Builds a validated project export, scoped to the owner. Returns null when the
 * project does not exist or is not owned by this user — never leaking existence.
 */
export async function collectProjectExport(
  db: Database,
  ownerId: string,
  projectId: string,
  now: Date = new Date(),
  productVersion?: string,
): Promise<AxonProjectExport | null> {
  const projectRows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, ownerId)))
    .limit(1);
  const project = projectRows[0];
  if (project === undefined) return null;

  const documentRows = await db
    .select({ document: documents.document })
    .from(documents)
    .where(and(eq(documents.projectId, projectId), eq(documents.ownerId, ownerId)))
    .limit(1);
  const document = documentRows[0]?.document;
  if (document === undefined) return null;

  const input: ProjectExportInput = {
    name: project.name,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    document,
    artifacts: await collectArtifacts(db, ownerId, projectId),
  };
  return assembleProjectExport(input, now, productVersion);
}

export interface AccountExportResult {
  readonly ok: true;
  readonly bundle: AxonAccountExport;
}
export interface AccountExportTooLarge {
  readonly ok: false;
  readonly reason: "too-large";
  readonly limit: number;
  readonly count: number;
}

/**
 * Builds the full account export for the authenticated owner: identity
 * metadata, every owned project (bounded), generation-usage counters, and
 * feedback metadata (category + date only — never message bodies).
 *
 * Excludes OAuth tokens, sessions, invite hashes, provider credentials, and any
 * other user's data. Bounded synchronously; oversized accounts get a truthful
 * limit rather than a partial success.
 */
export async function collectAccountExport(
  db: Database,
  ownerId: string,
  now: Date = new Date(),
  productVersion?: string,
): Promise<AccountExportResult | AccountExportTooLarge> {
  const projectRows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.ownerId, ownerId));
  if (projectRows.length > ACCOUNT_EXPORT_PROJECT_LIMIT) {
    return {
      ok: false,
      reason: "too-large",
      limit: ACCOUNT_EXPORT_PROJECT_LIMIT,
      count: projectRows.length,
    };
  }

  const projectExports: AxonProjectExport[] = [];
  for (const { id } of projectRows) {
    const bundle = await collectProjectExport(db, ownerId, id, now, productVersion);
    if (bundle !== null) projectExports.push(bundle);
  }

  const userRows = await db
    .select({ name: users.name, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, ownerId))
    .limit(1);
  const user = userRows[0];

  const accessRows = await db
    .select({ userId: betaAccess.userId })
    .from(betaAccess)
    .where(eq(betaAccess.userId, ownerId))
    .limit(1);

  const usageRows = await db
    .select({ day: generationUsage.day, count: generationUsage.count })
    .from(generationUsage)
    .where(eq(generationUsage.userId, ownerId));

  const feedbackRows = await db
    .select({ category: feedback.category, createdAt: feedback.createdAt })
    .from(feedback)
    .where(eq(feedback.userId, ownerId));

  const bundle: AxonAccountExport = {
    exportSchemaVersion: EXPORT_SCHEMA_VERSION,
    kind: "axon-account-export",
    exportedAt: now.toISOString(),
    ...(productVersion !== undefined && { productVersion }),
    disclaimer: ACCOUNT_EXPORT_DISCLAIMER,
    account: {
      ...(user?.name != null && { name: user.name }),
      ...(user?.email != null && { email: user.email }),
      betaAccess: accessRows.length > 0,
      ...(user?.createdAt != null && { accountCreatedAt: user.createdAt.toISOString() }),
    },
    projects: projectExports,
    generationUsage: usageRows.map((row) => ({ day: row.day, count: row.count })),
    // Feedback metadata only — message bodies are never included in exports.
    feedback: feedbackRows.map((row) => ({
      category: row.category,
      createdAt: row.createdAt.toISOString(),
    })),
    operationalNote:
      "Operational records such as authentication sessions, logs, and database backups are not part of this product-data export.",
  };
  return { ok: true, bundle };
}
