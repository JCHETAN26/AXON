# AXON

A living architecture-intelligence platform. AXON turns natural-language ideas
and existing systems into editable architecture diagrams, then reasons about
them — detecting reliability, security, and scalability risks, simulating
traffic and component failure, and proposing recommended architectures you can
preview, diff, and apply.

> **Status:** private, invite-only beta. Not open for public signup.

## Product loop

- **Design** — generate an architecture from a prompt, import an existing system
  (e.g. Docker Compose), or start from a sample.
- **Edit** — a spatial, keyboard-accessible canvas with autosave and
  reload-safe persistence.
- **Audit** — deterministic analysis surfaces findings with evidence linked to
  the represented components and relationships.
- **Recommend** — deterministic recommendations with Current / Recommended /
  Diff, explicit approval, and stale-audit reconciliation on apply.
- **Simulate** — baseline and stress scenarios (traffic, cache degradation,
  worker slowdown, dependency outage) rank the projected constraints.

## Tech stack

pnpm · Turborepo · Next.js 16 (App Router) · React 19 · strict TypeScript ·
Tailwind CSS · Vitest · Playwright · Auth.js (GitHub OAuth) · Drizzle ORM ·
PostgreSQL (PGlite in-process for local/test).

## Monorepo layout

```
apps/
  web/                          Next.js app (product + marketing + API routes)
packages/
  ui/                           Design-system primitives (semantic tokens)
  diagram-schema/               ArchitectureDocument types + validation
  architecture-audit/           Deterministic risk analysis
  architecture-recommendations/ Deterministic recommendation engine
  architecture-simulation/      Traffic + failure simulation
  architecture-compose-import/  Safe Docker Compose import (no execution)
  architecture-generation/      Prompt-to-architecture (live + offline provider)
  config/                       Shared TypeScript + ESLint config
docs/
  design/DESIGN.md              Source-of-truth design system
  ops/                          Operator + deployment runbooks
```

## Getting started (local)

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

Local mode uses in-browser/in-process storage — no database or accounts
required. To try live model generation, copy the env template and add a key:

```bash
cp apps/web/.env.example apps/web/.env.local
# set ANTHROPIC_API_KEY=... (otherwise a deterministic offline provider is used)
```

## Cloud / beta mode

Cloud mode adds owner-scoped persistence, GitHub sign-in, and invite-only
access. It fails closed: production refuses to start with unsafe configuration.
Configure `apps/web/.env.local` (never `.env.example`) with `AXON_PERSISTENCE_MODE=cloud`,
a Supabase PostgreSQL `DATABASE_URL` (pooled) and `DATABASE_MIGRATION_URL`
(direct), `AUTH_SECRET`, and GitHub OAuth credentials. See:

- `docs/ops/deployment-checklist.md` — full deploy steps
- `docs/ops/github-oauth-staging.md` — OAuth app + callback setup
- `docs/ops/migrations.md`, `docs/ops/verification.md` — database setup

## Scripts

```bash
pnpm dev            # dev servers
pnpm build          # production build
pnpm lint           # lint
pnpm typecheck      # strict type check
pnpm test           # unit + integration tests
pnpm test:e2e       # Playwright
pnpm format         # Prettier
```

Database and verification tooling (run from `apps/web`):

```bash
pnpm db:migrate            # apply migrations (direct connection)
pnpm verify:postgres       # guarded staging lifecycle check
pnpm verify:client-bundle  # scan the client build for server secrets
```

## Design

The approved design system in `docs/design/DESIGN.md` is the visual and
interaction source of truth. Light and dark themes are first-class,
`prefers-reduced-motion` is respected, and all interactive controls are
keyboard accessible.
