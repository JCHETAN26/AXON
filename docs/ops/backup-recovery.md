# Backup and recovery runbook

The intended deployment is **Vercel** (app) + **Supabase PostgreSQL**
(persistence). Supabase is treated as managed PostgreSQL only.

## Required operator setup

These are **not** automated by AXON and must be configured by the operator:

- **Backups**: enable Supabase automated backups (or `pg_dump` on a schedule).
  AXON does not create backups and makes no backup claim unless you configure
  them. Decide and record the frequency (e.g. daily) and who owns it.
- **Backup access control**: restrict who can download/restore backups.
- **Restore verification**: periodically restore a backup to a scratch database
  and run `pnpm verify:postgres` against it.

## Application behavior (already implemented)

- **Account/project deletion** removes records from the live database
  immediately and transactionally. It does **not** remove them from existing
  backups; deleted data may remain in a backup until that backup ages out per
  your retention schedule. This is stated on the Data Handling page.
- **Database unavailable**: `/api/ready` returns 503 (so a load balancer can
  withhold traffic); product requests fail safely without exposing detail.
- **Generation disable switch**: set `AXON_GENERATION_ENABLED=false` (or
  `AXON_GENERATION_MODE=offline`) to stop calling the AI provider during an
  incident.

## Incident responses

- **OAuth outage (GitHub down)**: existing signed-in sessions continue (JWT);
  new sign-ins fail. No action needed beyond status comms.
- **AI-provider outage**: disable generation (above); audits, simulations,
  recommendations, and Compose import are unaffected (deterministic).
- **Deployment rollback**: redeploy the previous known-good build on Vercel.
  Roll back schema only if a migration was applied — restore the pre-migration
  backup.
- **Migration failure**: restore the pre-migration backup, fix the migration,
  re-run `pnpm --filter @axon/web db:migrate`.
- **Secret rotation**: rotate `AUTH_SECRET` (invalidates existing sessions —
  users re-sign-in), GitHub client secret, database credentials, and the AI key
  in the deployment environment; redeploy. Never commit secrets.
- **Invite revocation**: delete or null the invite row for an unredeemed code
  (see operator-commands.md).

## Future improvements

- Point-in-time recovery tuning; automated restore drills; a formal RPO/RTO.
