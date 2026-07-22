Read `public-beta-launch.md` completely again.

Checkpoint 1 — Security, Routing and Recovery is complete and passing.

Do not rewrite Checkpoint 1 unless you discover a concrete regression or defect.
Preserve:

- The route-protection matrix
- Mutation request guards
- Same-origin checks
- Payload limits
- `Cache-Control: no-store`
- Session-expiry recovery
- Unsaved ArchitectureDocument recovery
- Network/save-state behavior
- CSP and security headers
- Cookie/session behavior
- Existing tests

Now execute only:

# Checkpoint 2 — Account and Data Lifecycle

Implement every Checkpoint 2 requirement from
`public-beta-launch.md`, including:

- Authenticated account settings
- Project export
- Full account data export
- Project deletion hardening
- Account deletion
- Data-retention behavior
- Privacy page
- Terms page
- Security / Trust page
- Data Handling page
- Legal and trust configuration gates
- Essential-cookie transparency
- Product-level error boundaries
- Account lifecycle accessibility and mobile behavior
- All required unit, integration, and Playwright tests

Do not begin Checkpoint 3.

Before modifying files:

1. Inspect the existing implementation.
2. Report which Checkpoint 2 capabilities already exist.
3. Identify concrete gaps.
4. Present a concise implementation plan.
5. Confirm how destructive operations will remain transactional and
   owner-scoped.

Important constraints:

- Never accept a client-provided user ID for account deletion or export.
- Derive identity only from the validated server session.
- Never export another user’s data.
- Never export OAuth tokens, sessions, invite hashes, provider credentials,
  database metadata, raw Compose YAML, secret-like values, or internal logs.
- Validate every domain JSON record before export.
- Account deletion must use a database transaction where supported.
- A failed account deletion must not report success.
- Account deletion must invalidate the active session.
- Deleted project copy must state that AXON does not modify deployed
  infrastructure.
- Do not claim immediate deletion from database backups unless it is actually
  implemented.
- Legal pages must not claim SOC 2, ISO 27001, HIPAA, GDPR certification,
  zero-retention AI processing, data residency, or other unverified compliance.
- Do not publish fake company names, legal contacts, jurisdictions, or support
  addresses.
- Production must require explicitly configured legal/trust contact values or
  surface a clear launch-blocking configuration failure.
- Document actual retention behavior rather than an aspirational policy.
- Keep local browser-project behavior distinct from cloud account data.
- Do not add analytics, cookie tracking, billing, subscriptions, teams,
  collaboration, public signup, or any new product capability.

Project export must be a versioned, validated AXON JSON bundle and must clearly
state that it is an AXON model export, not an infrastructure backup.

Account export must include only the authenticated user’s supported product
data and use a versioned export schema.

For account deletion, confirm the handling of:

- Projects
- Architecture documents
- Audits
- Recommendations
- Simulation profiles and runs
- Compose import drafts
- Migration records
- Beta-access grant
- Auth accounts and sessions
- Feedback
- Generation-usage records
- Database backups
- Browser-local copies

Where records are retained for security, abuse prevention, or operational
reasons, document that precisely and ensure architecture content is not
retained unnecessarily.

Run all Checkpoint 2 validation required by
`PUBLIC_BETA_LAUNCH_PROMPT.md`:

1. Formatting
2. Linting
3. Strict type checking
4. Project-export tests
5. Account-export tests
6. Project-deletion tests
7. Account-deletion tests
8. Cross-user IDOR tests
9. Legal-page rendering tests
10. Privacy and data-boundary tests
11. Accessibility tests
12. Relevant authenticated Playwright tests
13. Production build

Explicitly test that:

- User B cannot export User A’s project.
- User B cannot delete User A’s project.
- User B cannot delete User A’s account.
- Account export contains only the authenticated user’s data.
- Export does not contain raw Compose YAML or secrets.
- Failed deletion preserves the existing account and projects.
- A successful account deletion removes access and invalidates the session.
- Another user remains unaffected.
- Legal pages contain no unsupported security or compliance claims.
- Missing production legal configuration prevents an accidental launch with
  placeholders.
- Mobile pages have no horizontal overflow at 390px.
- Keyboard-only export and destructive confirmations work.

At completion, report:

- Files changed
- Existing functionality reused
- Account settings behavior
- Project export schema and exclusions
- Account export schema and exclusions
- Project deletion transaction behavior
- Account deletion transaction and retention behavior
- Session invalidation behavior
- Feedback and generation-usage retention decisions
- Browser-local data behavior
- Privacy page contents
- Terms page contents
- Security / Trust page contents
- Data Handling page contents
- Legal configuration requirements
- Error-boundary behavior
- Accessibility and responsive behavior
- Unit, integration, Playwright, and build results
- Known limitations
- Remaining Checkpoint 3 and 4 work
- Any launch blockers

Classify Checkpoint 2 as:

- PASSING
- BLOCKED

Stop after reporting Checkpoint 2.

Do not start Checkpoint 3.
