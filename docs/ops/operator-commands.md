# Operator commands

Safe, minimal operator commands. There is **no admin dashboard** and none is
planned for the beta.

| Task | How |
| --- | --- |
| Apply migrations | `pnpm --filter @axon/web db:migrate` |
| Inspect migration status | `pnpm --filter @axon/web db:status` |
| Verify PostgreSQL (staging) | `AXON_VERIFICATION_MODE=staging DATABASE_URL=… pnpm --filter @axon/web verify:postgres` |
| Verify client bundle | `pnpm --filter @axon/web build && pnpm --filter @axon/web verify:client-bundle` |
| Check readiness | `curl -s https://<host>/api/ready` |
| Disable generation | Set `AXON_GENERATION_ENABLED=false` (or `AXON_GENERATION_MODE=offline`) and redeploy |

## Invitations

Invitations are managed directly against the database with the existing helpers
(no public endpoint):

- **Create**: call `createInvite(db, code, note?)` (`lib/server/beta.ts`) via a
  one-off script or a psql insert into `beta_invites (code)`. Share the raw code
  through a secure channel; store only the code, never a hash the user needs.
- **Revoke (unredeemed)**: delete the `beta_invites` row for the code, or set
  its `redeemed_by_user_id` to a sentinel so it can no longer be redeemed.

```sql
-- create
insert into beta_invites (code, note) values ('BETA-XXXX', 'design partner');
-- revoke an unredeemed invite
delete from beta_invites where code = 'BETA-XXXX' and redeemed_by_user_id is null;
```

## Export a user's data

Use the **product flow** — the user signs in and downloads from `/account`
("Download account data"). Operators do not extract another user's project
content.

## Investigate feedback

Query feedback **metadata** without exposing project content or messages beyond
what is necessary:

```sql
select id, user_id, category, created_at from feedback order by created_at desc limit 50;
```

Feedback is never linked to a project and never contains architecture content.
