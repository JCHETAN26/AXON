import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let database: Database | undefined;
let asyncDatabase: Promise<Database> | undefined;

/**
 * Synchronous accessor for the PostgreSQL-backed runtime database. Used by the
 * production `postgres` driver path. Prefer {@link getDatabaseAsync}, which also
 * supports the self-contained PGlite runtime used for local cloud-mode testing.
 */
export function getDatabase(): Database {
  if (database !== undefined) return database;
  const url = process.env.DATABASE_URL;
  if (url === undefined || url.length === 0) {
    throw new Error("DATABASE_URL is not set; cannot connect to the database.");
  }
  // Supabase's transaction pooler (Vercel's recommended serverless path) does
  // not support prepared statements, so they are disabled. A pooled URL keeps a
  // small per-instance pool; a direct connection may use more. Transactions
  // (used by account deletion) are supported by the transaction pooler.
  const pooled = url.includes("pooler") || url.includes(":6543");
  const client = postgres(url, {
    prepare: false,
    max: pooled ? 1 : 10,
    idle_timeout: 20,
  });
  database = drizzlePg(client, { schema });
  return database;
}

/**
 * Resolves the runtime database for either driver:
 *
 * - `postgres` (default): a real PostgreSQL connection via `DATABASE_URL`.
 * - `pglite` (opt-in via `AXON_DB_DRIVER=pglite`): an in-process PGlite
 *   database with migrations applied on first use. This makes cloud mode fully
 *   self-contained so the authenticated experience can be exercised end-to-end
 *   without provisioning an external database. It is a dev/test convenience and
 *   is never selected implicitly.
 */
const GLOBAL_DB_KEY = Symbol.for("axon.pglite.database");
type GlobalWithDb = typeof globalThis & { [GLOBAL_DB_KEY]?: Promise<Database> };

export function getDatabaseAsync(): Promise<Database> {
  if (process.env.AXON_DB_DRIVER === "pglite") {
    // A single in-process PGlite instance must be shared across every route
    // handler, the auth provider, and server components. Next.js dev can load
    // this module into separate registries, so the instance is cached on
    // globalThis rather than a module local to guarantee one database.
    const globalWithDb = globalThis as GlobalWithDb;
    globalWithDb[GLOBAL_DB_KEY] ??= initPglite();
    return globalWithDb[GLOBAL_DB_KEY];
  }
  asyncDatabase ??= Promise.resolve(getDatabase());
  return asyncDatabase;
}

async function initPglite(): Promise<Database> {
  const [{ PGlite }, { drizzle }, { migrate }, { fileURLToPath }, { dirname, join }] =
    await Promise.all([
      import("@electric-sql/pglite"),
      import("drizzle-orm/pglite"),
      import("drizzle-orm/pglite/migrator"),
      import("node:url"),
      import("node:path"),
    ]);
  // A directory persists the database across requests in a single server
  // process; unset means ephemeral in-memory.
  const dataDir = process.env.AXON_PGLITE_DIR;
  const client = dataDir !== undefined && dataDir.length > 0 ? new PGlite(dataDir) : new PGlite();
  const db = drizzle(client, { schema });
  const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), "migrations");
  await migrate(db, { migrationsFolder });
  return db as unknown as Database;
}

export { schema };
