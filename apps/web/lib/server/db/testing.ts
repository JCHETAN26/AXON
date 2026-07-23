import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import * as schema from "./schema";
import { type Database } from "./client";

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "migrations");

/**
 * An in-process PostgreSQL (PGlite) database with the real migrations applied.
 * Used by integration tests so owner-scoping and IDOR behaviour are verified
 * against genuine SQL semantics, with no external service.
 */
export async function createTestDatabase(): Promise<Database> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return db as unknown as Database;
}

/**
 * Empties every table so one PGlite database can be reused across a file's
 * tests — far cheaper than re-running migrations per test, and it keeps the
 * shared vitest run from starving under parallel load.
 */
export async function resetTestDatabase(db: Database): Promise<void> {
  await db.execute(sql`
    truncate table
      generated_infrastructure_prs, telemetry_metrics, telemetry_sources,
      cloud_discovery_runs, cloud_connections, github_pr_analysis_runs,
      architecture_drifts, architecture_snapshots,
      architecture_proposals, repository_evidence, repository_analysis_runs,
      connected_repositories, github_installations, github_install_states,
      feedback, generation_usage, artifacts, documents, projects,
      beta_access, beta_invites, sessions, accounts, verification_tokens, users
    restart identity cascade
  `);
}
