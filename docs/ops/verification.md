# Verification tooling

Two operator commands verify a deployment. Neither provisions or modifies
external resources beyond the records they explicitly create.

## `pnpm verify:postgres`

Exercises the full owner-scoped lifecycle against a **staging** database:
connection, migration availability, auth-user creation, invite
creation/redemption, beta grant, project + JSONB document persistence, validated
read-back, optimistic-concurrency conflict, owner isolation, audit /
recommendation / simulation / import-draft persistence (verifying no secret
leaks into an export), generation-usage lifecycle, feedback persistence, and
account-deletion cascade.

```bash
AXON_VERIFICATION_MODE=staging DATABASE_URL="postgres://…/axon_staging" \
  pnpm --filter @axon/web verify:postgres
```

Guarantees:

- Refuses to run unless `AXON_VERIFICATION_MODE=staging`.
- Refuses a production-like target unless
  `AXON_VERIFICATION_ALLOW_DESTRUCTIVE=yes-i-understand` is also set.
- Every created record uses a unique `axon-verify-<time>-<rand>` prefix.
- Cleans up in a `finally` block; on partial failure it prints the prefix so
  leftover records can be found.
- Never prints database credentials, auth secrets, or invitation values.
- Exits non-zero on the first failed stage and names that stage.

## `pnpm verify:client-bundle`

Run **after** `pnpm build`. Scans the client-served `.next/static` artifacts
(including source maps) for accidentally-included server secrets.

```bash
pnpm --filter @axon/web build
pnpm --filter @axon/web verify:client-bundle
```

Guarantees:

- Reports only a variable name and a short **fingerprint** — never the value.
- Distinguishes the public GitHub client id (allowed) from the client secret.
- Exits non-zero on a confirmed leak.
- Limitation: static scanning cannot prove a transformed or split secret is
  absent; treat it as a strong check, not a guarantee.
