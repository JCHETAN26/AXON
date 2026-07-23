# Operator commands

Safe, minimal operator commands. There is **no admin dashboard** and none is
planned for the beta.

| Task | How |
| --- | --- |
| Apply migrations | `pnpm --filter @axon/web db:migrate` |
| Inspect migration status | `pnpm --filter @axon/web db:status` |
| Create an invitation | `pnpm --filter @axon/web beta:invite --email <address> --expires-in 7d` |
| Revoke an unredeemed invitation | `pnpm --filter @axon/web beta:invite --revoke <RAW-TOKEN>` |
| Verify PostgreSQL (staging) | `AXON_VERIFICATION_MODE=staging DATABASE_URL=… pnpm --filter @axon/web verify:postgres` |
| Verify client bundle | `pnpm --filter @axon/web build && pnpm --filter @axon/web verify:client-bundle` |
| Check readiness | `curl -s https://<host>/api/ready` |
| Disable generation | Set `AXON_GENERATION_ENABLED=false` (or `AXON_GENERATION_MODE=offline`) and redeploy |

## Invitations

Invitations use the `beta:invite` operator command (there is no public
endpoint). The command connects through `DATABASE_URL`, so load the environment
first (`set -a; source apps/web/.env.local; set +a`).

- **Create**: `pnpm --filter @axon/web beta:invite --email <address> [--expires-in 7d] [--note "..."]`.
  A high-entropy token is generated and **only its SHA-256 hash is stored** — the
  raw token is printed once and cannot be recovered. The invitation is
  single-use, restricted to that email, and expires (default 7 days). Share the
  token through a secure channel.
- **Revoke (unredeemed)**: `pnpm --filter @axon/web beta:invite --revoke <RAW-TOKEN>`.
  Deletes the matching unredeemed invitation; already-redeemed invitations are
  left intact (their access lives in `beta_access`).

Redemption enforces, in order: token validity, expiry, email match, and single
use. Signing in never grants access on its own — only redemption does.

To revoke an already-granted user's access, remove their `beta_access` row:

```sql
-- revoke beta access for a specific user (by email)
delete from beta_access where user_id = (select id from users where email = 'person@example.com');
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
