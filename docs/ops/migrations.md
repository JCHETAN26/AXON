# Database migrations

AXON uses Drizzle migrations. Migrations are **never** run during a page
request — the runtime only applies migrations for the in-process PGlite test
driver. In production, migrations are an explicit deploy step.

## Commands

```bash
# Generate SQL from schema.ts after editing the schema (no database needed)
pnpm --filter @axon/web db:generate

# Apply pending migrations to the configured DATABASE_URL.
# Load the environment first so DATABASE_URL is set:
set -a; source apps/web/.env.local; set +a
pnpm --filter @axon/web db:migrate

# Inspect / reconcile migration state
pnpm --filter @axon/web db:status
```

`db:migrate` runs `scripts/migrate.ts` (the Drizzle `postgres-js` migrator with
`prepare: false`), applying pending migrations against `DATABASE_URL` and
recording them in `drizzle.__drizzle_migrations`. Re-running is a safe no-op.

## Supabase connection note (important)

Point `DATABASE_URL` at the **transaction pooler** (`...pooler.supabase.com:6543`)
for migrations, not the direct connection:

- Supabase's **direct** host (`db.<ref>.supabase.co:5432`) is now **IPv6-only**
  and does not resolve on many IPv4 networks (`ENOTFOUND`).
- The **pooler** is transaction-scoped, which requires `prepare: false` — which
  `drizzle-kit migrate` cannot set, but `scripts/migrate.ts` does. Each migration
  file runs in its own transaction, which the pooler supports. A `NOTICE` such as
  "relation __drizzle_migrations already exists, skipping" or a truncated
  constraint-identifier name is harmless.

## Environments

- **Local**: point `DATABASE_URL` at a local Postgres and run `db:migrate`, or
  use the PGlite test driver (`AXON_DB_DRIVER=pglite`) which auto-applies
  migrations in-process for tests only.
- **Staging**: set the staging `DATABASE_URL`, run `db:migrate`, then run
  `pnpm --filter @axon/web verify:postgres` (see verification.md).
- **Production**: run `db:migrate` against the production `DATABASE_URL` as a
  deploy step, **after** taking a backup (see backup-recovery.md). Do not run
  it automatically from application code.

## Safety

- Drizzle applies each migration file within a transaction where the SQL
  permits it. Not every schema change is transactional or reversible; **AXON
  does not promise automatic rollback**. Recover from a failed migration by
  restoring the pre-migration backup (see backup-recovery.md).
- There is **no** production-database reset command. `resetTestDatabase` is
  test-only (it truncates all tables) and lives in `lib/server/db/testing.ts`;
  it must never be pointed at a real database.
- `/api/ready` fails (503) when the core schema is unavailable, so a deployment
  with unapplied migrations will not be marked ready.
- Disable generation during risky operational work with
  `AXON_GENERATION_ENABLED=false` (or `AXON_GENERATION_MODE=offline`).
