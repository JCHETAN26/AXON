# Staging → production deployment checklist

Target: Vercel (app) + Supabase PostgreSQL + Auth.js/GitHub + AI provider.
PGlite is for local/automated tests only and must never back production.

## Environment (production, cloud mode)

Set on Vercel (never commit):

```
AXON_PERSISTENCE_MODE=cloud
NEXT_PUBLIC_AXON_PERSISTENCE_MODE=cloud
DATABASE_URL=<Supabase transaction-pooler URL>   # host contains "pooler" / :6543
AUTH_SECRET=<32+ char strong secret>
AUTH_GITHUB_ID / AUTH_GITHUB_SECRET
AXON_APP_URL=https://<host>
ANTHROPIC_API_KEY   # or AXON_GENERATION_ENABLED=false
AXON_LEGAL_COMPANY_NAME / AXON_LEGAL_SUPPORT_EMAIL / AXON_LEGAL_PRIVACY_EMAIL / AXON_LEGAL_EFFECTIVE_DATE
AXON_BUILD_ID=<safe build id>   # optional
```

`instrumentation.ts` validates all of this at boot and **fails closed** if any
is missing/invalid (test-auth on, PGlite driver, placeholder secret, invalid
URL, missing legal contacts, etc.).

## Steps

1. Provision Supabase PostgreSQL; note the **transaction pooler** connection
   string (the app disables prepared statements for it automatically).
2. Configure GitHub OAuth (see github-oauth-staging.md) with the exact callback.
3. Configure environment (above).
4. `pnpm --filter @axon/web db:migrate` against staging.
5. `pnpm --filter @axon/web verify:postgres` against staging.
6. `pnpm --filter @axon/web build` then `pnpm --filter @axon/web verify:client-bundle`.
7. Deploy staging; verify `/api/health` (200) and `/api/ready` (200).
8. Complete the GitHub OAuth smoke test.
9. Create an email-restricted invitation; complete a full AXON workflow.
10. Test with a **second** GitHub account: confirm IDOR protection, generation
    quota, feedback, export, and project deletion.
11. Exercise session expiry (recoverable unsaved edit) and account deletion.
12. Review logs for any sensitive content (there should be none).
13. Back up the database.
14. Promote to production; repeat the non-destructive smoke tests.

## Do not

- Deploy with `AXON_TEST_AUTH=1` or `AXON_DB_DRIVER=pglite`.
- Run migrations from application code.
- Reset the production database.
