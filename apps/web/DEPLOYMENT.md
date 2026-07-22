# AXON deployment (private beta)

AXON runs in one of two persistence modes, chosen explicitly. Production must
select one — it never falls back implicitly.

## Modes

| Mode    | Storage         | Auth         | Use                             |
| ------- | --------------- | ------------ | ------------------------------- |
| `local` | browser storage | none         | local development, open preview |
| `cloud` | PostgreSQL      | GitHub OAuth | private beta with real accounts |

`AXON_PERSISTENCE_MODE` selects the mode. It is **required in production** — an
unset value fails closed at startup rather than silently degrading to anonymous
local behavior. Cloud mode additionally requires a database and `AUTH_SECRET`.

## Environment (cloud mode)

| Variable                                  | Required   | Notes                                        |
| ----------------------------------------- | ---------- | -------------------------------------------- |
| `AXON_PERSISTENCE_MODE=cloud`             | yes        | Server mode.                                 |
| `NEXT_PUBLIC_AXON_PERSISTENCE_MODE=cloud` | yes        | Client mode; must match the server.          |
| `DATABASE_URL`                            | yes        | PostgreSQL connection string.                |
| `AUTH_SECRET`                             | yes        | `npx auth secret`.                           |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`   | yes (prod) | GitHub OAuth app, identity scopes only.      |
| `ANTHROPIC_API_KEY`                       | optional   | Live generation; offline template otherwise. |

`AXON_TEST_AUTH` must never be set in production — startup validation rejects
it, and the provider is not registered when `NODE_ENV=production` regardless.

Startup validation (`instrumentation.ts` → `validateDeploymentConfig`) refuses
to boot on a misconfigured deployment.

## Database migrations

```
pnpm --filter @axon/web exec drizzle-kit generate   # after editing schema.ts
pnpm --filter @axon/web exec drizzle-kit migrate     # apply to DATABASE_URL
```

## GitHub OAuth app

- Homepage URL: `https://<host>`
- Authorization callback URL: `https://<host>/api/auth/callback/github`
- Request only identity scopes (`read:user`, `user:email`). **No repository
  scope** is requested or needed.

## Onboarding a design partner

1. Create an invite code (server-side), e.g. via the `createInvite` helper or a
   one-off script against the database.
2. Share the code. The partner signs in with GitHub, is gated to `/invite`,
   redeems the code once, and gains beta access.
3. On first visit they may migrate any browser-local projects into their
   account (explicit consent; local copies are kept unless they opt to remove
   them).

## Health

`GET /api/health` returns liveness and, in cloud mode, readiness (a database
connectivity check). It responds 503 when the database is unreachable, so a
load balancer can withhold traffic. It exposes no internal detail.

## Security posture

- Sessions are validated server-side; identity never comes from the request.
- Product data is owner-scoped; cross-user resources return not-found.
- Baseline security headers are set for every response (see `next.config.ts`):
  HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`, a restrictive
  `Permissions-Policy`, and `Referrer-Policy`.
- The `postgres` and PGlite drivers are server-external — never bundled to the
  client or edge.

## Authenticated tests

`pnpm --filter @axon/web test:e2e:cloud` runs the full authenticated journey
against a self-contained cloud server (in-process PGlite + fail-closed
test-auth), requiring no external database or OAuth.
