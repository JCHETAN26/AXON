/**
 * Applies pending Drizzle migrations to the configured database.
 *
 *   set -a; source .env.local; set +a; pnpm --filter @axon/web db:migrate
 *
 * Uses DATABASE_URL with `prepare: false` so it works through the Supabase
 * transaction pooler. This is deliberate: Supabase's direct connection host
 * (db.<ref>.supabase.co:5432) is IPv6-only and unreachable on many networks,
 * and drizzle-kit's built-in migrate cannot disable prepared statements. Each
 * migration file runs in its own transaction, which the pooler supports.
 *
 * Migrations are ordered and recorded in drizzle.__drizzle_migrations, so each
 * runs exactly once and re-running is a safe no-op.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.trim() === "") {
    console.error("DATABASE_URL is not set. Load the environment first, e.g. `source .env.local`.");
    process.exit(1);
  }

  const migrationsFolder = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "lib",
    "server",
    "db",
    "migrations",
  );

  const sql = postgres(url, { prepare: false, max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder });
    console.info("Migrations applied (pending only; already-applied ones are skipped).");
  } finally {
    await sql.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Migration failed.");
  process.exit(1);
});
