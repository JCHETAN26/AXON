# AXON server (private-beta infrastructure)

This directory holds the server-only stack: database, authentication, beta
access control, owner-scoped repositories, and generation metering. Nothing
here is imported by client components.

## Stack

- **Auth.js v5** (`next-auth`) — GitHub OAuth (identity scopes only, no repo
  access) plus a deterministic **test-auth** provider that is enabled only when
  `NODE_ENV !== "production"` and `AXON_TEST_AUTH=1`. It fails closed in
  production and is never a hidden bypass.
- **Drizzle ORM** + **PostgreSQL** (`postgres` driver) in production.
  **PGlite** (in-process WASM Postgres) backs integration tests so owner-scoping
  and IDOR behaviour are verified against real SQL, with no external database.

Drizzle only — Prisma is intentionally not used.

## Local vs cloud mode

`isCloudMode()` is true when `DATABASE_URL` is set. Cloud mode turns on
server persistence, authentication, beta gating, and generation quotas. Without
a database the product runs local-first (browser storage, no auth), which keeps
development and the current e2e suite frictionless.

## Security model

- User identity always comes from the validated server-side session
  (`getCurrentUser`), never from a request-supplied id, email, or resource id.
- Every product query is scoped by `ownerId`. A resource owned by another user
  is indistinguishable from one that does not exist (null / zero rows), so
  insecure direct object references and existence leaks are prevented.
- Signing in does not grant beta access; a user must redeem an invite.

## Migrations

```
# generate SQL from the schema after editing schema.ts
pnpm --filter @axon/web exec drizzle-kit generate

# apply to the configured DATABASE_URL
pnpm --filter @axon/web exec drizzle-kit migrate
```

Tests apply the same migrations to a fresh PGlite database
(`db/testing.ts`).

## Environment

See `apps/web/.env.example`. Cloud mode requires `DATABASE_URL`, `AUTH_SECRET`,
and the GitHub OAuth credentials.
