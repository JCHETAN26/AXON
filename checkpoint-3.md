# Checkpoint 3 — Production and Operational Readiness

Implement every Checkpoint 3 requirement from
`public-beta-launch.md`.

Do not begin Checkpoint 4.

The intended beta deployment architecture is:

- Vercel for the Next.js application
- Supabase PostgreSQL for cloud persistence
- Auth.js with GitHub OAuth
- Existing AI provider for architecture generation
- PGlite only for local and automated testing

Supabase should be treated as managed PostgreSQL only.

Do not replace Auth.js with Supabase Auth.

Before modifying files:

1. Inspect the existing production and deployment implementation.
2. Report which Checkpoint 3 requirements already exist.
3. Identify exact gaps.
4. Present a concise implementation plan.
5. Explain any Vercel or Supabase-specific compatibility risks.
6. Confirm that no external resources will be provisioned or modified
   automatically.

Preserve:

- Explicit production cloud mode
- Production fail-closed behavior
- Existing authentication
- Existing beta gating
- Owner-scoped repositories
- Optimistic concurrency
- Generation quotas
- Account lifecycle behavior
- Security headers
- Existing tests

──────────────────────────────────────────────────────────────────────────────

# 1. Liveness and readiness

──────────────────────────────────────────────────────────────────────────────

Verify or complete:

- `/api/health`
- `/api/ready`

## `/api/health`

Must:

- Be publicly accessible
- Return quickly
- Not depend on PostgreSQL
- Confirm that the server process can respond
- Return only safe status and build metadata
- Use `Cache-Control: no-store`
- Never expose configuration or infrastructure details

Suggested response:

```json
{
  "status": "ok",
  "version": "safe-build-identifier"
}
/api/ready

In cloud mode, it must:

Validate required configuration
Test PostgreSQL connectivity
Use a short named timeout
Use a cheap read-only query
Return 200 only when ready
Return 503 when required dependencies are unavailable
Use Cache-Control: no-store
Never expose:
Database URL
Database host
Database user
Supabase project reference
SQL
Stack trace
OAuth configuration
AI-provider credentials

In local mode, report readiness accurately without pretending PostgreSQL is
configured.

Health probes must not create records or consume unnecessary connections.

Add tests for:

Local liveness
Local readiness
Cloud readiness success
Database timeout
Database rejection
Invalid production configuration
Safe response shape
No sensitive information in failure responses

──────────────────────────────────────────────────────────────────────────────

2. Vercel and Supabase database compatibility

──────────────────────────────────────────────────────────────────────────────

Inspect the actual database driver, ORM, and connection setup.

Confirm compatibility with:

Vercel serverless functions
Supabase PostgreSQL
Supavisor transaction-mode pooling
Direct PostgreSQL connections for migrations

Preferred conceptual environment separation:

DATABASE_URL=<Supabase pooled runtime URL>
DATABASE_MIGRATION_URL=<Supabase direct migration URL>

Do not assume these names if the repository already uses established names.
Follow current conventions where practical.

Requirements:

Runtime application traffic uses a pooler-compatible connection
Migration tooling can use a direct PostgreSQL URL
Prepared statements are disabled where required by transaction-mode pooling
Database connections are not created excessively on every request
Serverless function reuse is handled safely
Database clients remain server-only
PostgreSQL and PGlite packages remain absent from browser bundles
Pooler and direct URLs are never exposed to the client
Connection failures return structured safe errors
Readiness uses the runtime connection behavior

If the selected driver cannot safely use Supavisor transaction mode:

Document the incompatibility
Implement the safest compatible configuration
Do not conceal the limitation

Add documentation explaining:

Which Supabase connection string is used at runtime
Which connection string is used for migrations
Whether prepared statements are disabled
How connection pooling behaves on Vercel

──────────────────────────────────────────────────────────────────────────────

3. Real PostgreSQL verification command

──────────────────────────────────────────────────────────────────────────────

Implement:

pnpm verify:postgres

This command must allow an operator to verify the application against a real
PostgreSQL database such as Supabase staging.

Require an explicit verification mode, for example:

AXON_VERIFICATION_MODE=staging

Refuse to run when verification mode is missing.

Refuse to run against production unless an additional explicit confirmation
flag is supplied.

The command should safely verify:

Database connection
Required migrations/schema availability
Authentication user creation
Invite creation
Invite redemption
Beta-access grant
Project creation
ArchitectureDocument JSON persistence
Validated JSON read
Project rename
Optimistic-concurrency success
Optimistic-concurrency conflict
Owner isolation
Audit artifact persistence
Recommendation persistence
Simulation-profile persistence
Latest simulation-run persistence
Compose import-draft persistence
Generation-usage lifecycle
Feedback persistence
Project deletion
Cleanup of generated verification records

Requirements:

Use unique verification prefixes
Track all created IDs
Delete only verification-created records
Clean up in finally where safe
Never truncate tables
Never reset the database
Never delete unrelated records
Never print database credentials
Never print invite-token hashes
Never print auth secrets
Never print provider credentials
Avoid printing a raw invite token unless strictly necessary
Exit non-zero on failure
Report the exact verification stage that failed
Keep errors sanitized
Require a direct or appropriately compatible database connection

Add safety tests for:

Missing verification mode
Production refusal
Explicit production confirmation
Invalid database configuration
Cleanup targeting only verification records

Do not run the real verification command automatically in CI.

──────────────────────────────────────────────────────────────────────────────

4. Database migrations and safety

──────────────────────────────────────────────────────────────────────────────

Verify and document commands for:

Generate migrations
Apply migrations locally
Apply migrations to staging
Apply migrations to production
Inspect migration status
Verify schema readiness
Reset only a test database
Back up before production migration

Requirements:

Normal application requests must not automatically run destructive migrations
Test reset commands must reject production
Migration commands must support the direct migration URL
Document whether migrations are transactional
Do not promise automatic rollback unless implemented
Document how migration failure is surfaced
Document how to disable generation during database maintenance
Readiness should fail safely if required schema is unavailable where practical
Do not run production migrations from a Vercel request handler

Add script guards where needed.

──────────────────────────────────────────────────────────────────────────────

5. GitHub OAuth staging verification

──────────────────────────────────────────────────────────────────────────────

Create a manual staging smoke-test guide.

Document:

Create or configure the GitHub OAuth application
Set homepage URL
Set the exact Auth.js callback URL
Configure the staging application URL
Verify only identity-related scopes are requested
Sign in with a real GitHub account
Confirm the correct user record is created or linked
Confirm signing in does not grant beta access
Confirm non-beta user reaches the invite page
Create an email-restricted invitation
Redeem the invitation
Confirm safe return destination
Confirm malicious return paths are rejected
Create a project
Sign out
Confirm protected access is removed
Sign in again
Confirm projects persist
Confirm provider tokens are absent from browser session data
Confirm OAuth secrets are absent from browser storage and client bundles

Do not automate live GitHub OAuth in CI.

Document the expected callback route based on the existing Auth.js
configuration rather than guessing.

──────────────────────────────────────────────────────────────────────────────

6. Invitation operator commands

──────────────────────────────────────────────────────────────────────────────

Verify or complete safe commands for:

pnpm beta:invite --email user@example.com --expires-in 7d

and, where supported:

pnpm beta:revoke --invite-id <id>

Also determine whether an operator can revoke an already-redeemed user’s beta
access.

If not currently supported, add a safe server-side command such as:

pnpm beta:revoke-access --email user@example.com

Requirements:

Database-backed only
No admin dashboard
Require cloud database configuration
Validate email and duration inputs
Store only invitation hashes
Print the raw invitation token exactly once
Never print invitation hashes as redeemable values
Revoking unused invitations must prevent redemption
Revoking beta access must not delete the user’s projects
Document whether active sessions require reauthentication before the revoked
user is fully blocked
Do not trust client-supplied ownership

Add command-input and safety tests.

──────────────────────────────────────────────────────────────────────────────

7. Production environment validation

──────────────────────────────────────────────────────────────────────────────

Centralize and complete production configuration validation.

The intended public invite-only production deployment requires:

Explicit cloud persistence mode
Supabase/PostgreSQL runtime URL
Direct migration URL where required
Auth.js secret
GitHub OAuth client ID
GitHub OAuth client secret
Valid public application URL
Matching public/server persistence mode flags
Generation feature flag
Valid AI provider
Valid AI model
AI-provider credential when generation is enabled
Positive monthly generation limit
Positive per-minute limit
Positive concurrency limit
Legal/operator name
Support email
Privacy email
Legal effective date
Safe build/version identifier where required

Reject in production:

Missing persistence mode
Local persistence mode for the public beta deployment
Missing database URL
Missing auth secret
Placeholder auth secret
Missing GitHub credentials
Test authentication
PGlite database driver
Fake AI provider
Invalid application URL
HTTP production URL unless deliberately supported behind a trusted proxy
Unknown AI provider
Invalid generation limits
Mismatched public and server persistence mode
Placeholder legal values
Unsafe callback configuration
Development-only credentials

Requirements:

Do not print secret values
Fail boot clearly
Use stable safe error codes where appropriate
Add configuration-matrix tests
Update .env.example
Document which variables belong in Vercel production, preview, and development

Do not rename all internal AXON_* variables merely because the product name
may change.

──────────────────────────────────────────────────────────────────────────────

8. Vercel deployment compatibility

──────────────────────────────────────────────────────────────────────────────

Review the repository for Vercel compatibility.

Verify:

Next.js runtime selection
Node runtime requirements
Edge proxy compatibility
Database code never runs in Edge runtime
PostgreSQL packages remain server-only
Auth.js route compatibility
Dynamic authenticated pages
Build-time versus runtime environment use
Health/readiness behavior
File-system assumptions
No persistent local disk assumptions
No background process assumptions
No long-lived in-memory correctness assumptions
Generation timeouts fit serverless constraints
Abort and cleanup behavior
Global database-client reuse is safe
PGlite code is excluded from production
Uploaded Compose files are processed within supported request-size limits
Export downloads work through Vercel route handlers

Do not deploy automatically.

Document any Vercel function duration or memory setting that must be configured.

Do not claim that serverless memory or global state is durable.

──────────────────────────────────────────────────────────────────────────────

9. AI generation production safeguards

──────────────────────────────────────────────────────────────────────────────

Verify:

Generation is disabled when feature flag is false
Anonymous generation is impossible
Non-beta generation is impossible
Project ownership is required
Prompt length is bounded
Monthly quota is server-enforced
Per-minute limit is server-enforced
Concurrent-call limit is server-enforced
Provider key is server-only
Provider timeout is bounded
Cancellation and timeout release concurrency state
Provider error bodies are sanitized
Monthly quota follows the documented policy
Failed calls remain rate limited
The provider cannot be selected arbitrarily by the browser
No local-mode generation fallback occurs in production
A kill switch can disable generation without disabling the rest of the product

Document recommended initial beta values:

Monthly completed generations per user: 10
Submitted attempts per minute: 2
Concurrent provider calls per user: 1

Keep values configurable.

Do not add billing.

──────────────────────────────────────────────────────────────────────────────

10. Client-bundle secret scan

──────────────────────────────────────────────────────────────────────────────

Implement:

pnpm verify:client-bundle

Run it after the production build.

Scan generated client artifacts and public source maps where applicable for
possible exposure of:

Database URL
Direct migration URL
Auth secret
GitHub OAuth client secret
AI-provider API keys
Test-auth credentials
Unsafe test fixture identities
Invitation raw tokens
Invitation-token hashes
Compose test secrets
Private database details
Placeholder production secrets
Server-only environment values

Requirements:

Never print actual secret values
Report safe variable names or fingerprints
Distinguish public client identifiers from secrets
Avoid obvious false positives
Exit non-zero on confirmed exposure
Document static-scan limitations
Add tests using safe fake secret fixtures
Ensure PostgreSQL and PGlite implementation strings do not imply bundled
server code where avoidable

Add this command to the release checklist.

──────────────────────────────────────────────────────────────────────────────

11. Dependency security review

──────────────────────────────────────────────────────────────────────────────

Run the repository-appropriate dependency audit.

Do not blindly apply major upgrades.

Classify findings as:

Critical/high runtime risk
Development-only risk
Transitive dependency
Fix available
Fix unsafe tonight
Deferred

Requirements:

Fix clear critical exploitable runtime issues where practical
Avoid unrelated dependency churn
Do not break existing deterministic product behavior
Report unresolved findings honestly
Do not claim there are no vulnerabilities when findings remain
Record the exact command used

──────────────────────────────────────────────────────────────────────────────

12. Logging and privacy

──────────────────────────────────────────────────────────────────────────────

Review server logging.

Allowed:

Request ID
Safe internal user subject
Project ID
Operation
Error code
Duration
HTTP status
AI provider/model
Safe token counts

Never log:

Full prompts
ArchitectureDocument JSON
Compose YAML
Imported secret values
Database URLs
OAuth tokens
Session cookies
Auth secret
Invitation tokens
Invitation hashes
Feedback message body
AI-provider response body
Environment-variable values

Add or strengthen safe logging wrappers and tests where needed.

Document log-redaction rules.

Do not add a paid or third-party logging platform.

──────────────────────────────────────────────────────────────────────────────

13. Backup and recovery runbook

──────────────────────────────────────────────────────────────────────────────

Create or complete a realistic operator runbook.

Document:

Supabase Free backup limitations
Whether automatic backups are configured
Manual backup expectations before migration
How to create a database backup where available
Who is responsible for backups
Restore testing expectations
How deleted account data may remain in backups
How long backups are retained when known
How to disable generation
Database outage behavior
GitHub OAuth outage behavior
AI-provider outage behavior
Deployment rollback
Migration failure response
Auth-secret rotation
GitHub OAuth-secret rotation
AI-provider-key rotation
Invitation revocation
Beta-access revocation
Incident communication expectations

Do not claim backups exist when they have not been configured.

Separate:

Application behavior
Vercel configuration
Supabase configuration
Operator responsibilities
Future improvements

──────────────────────────────────────────────────────────────────────────────

14. Deployment documentation

──────────────────────────────────────────────────────────────────────────────

Create a concrete Vercel + Supabase deployment guide.

Document the exact sequence:

Create Supabase project
Choose a region near the Vercel deployment region
Obtain pooled runtime URL
Obtain direct migration URL
Configure database driver
Apply migrations
Run verify:postgres
Create GitHub OAuth application
Configure callback URL
Create Vercel project
Configure environment variables
Run production build locally
Run verify:client-bundle
Deploy preview/staging
Verify /api/health
Verify /api/ready
Complete real GitHub OAuth test
Create invitation
Complete full product workflow
Test with a second GitHub account
Verify IDOR protections
Verify generation limits
Verify feedback
Verify project export
Verify project deletion
Verify account deletion only with a disposable staging account
Review sanitized logs
Review Supabase usage
Deploy production
Repeat non-destructive smoke checks

Include rollback guidance for:

Vercel deployment
Generation feature flag
OAuth misconfiguration
Database migration failure
AI-provider outage

Do not promise zero downtime.

──────────────────────────────────────────────────────────────────────────────

15. Operator and user documentation

──────────────────────────────────────────────────────────────────────────────

Complete:

Beta operator checklist
Invitation creation guide
Invitation revocation guide
Beta-access revocation guide
GitHub OAuth staging checklist
Supabase migration guide
Vercel deployment guide
Backup and recovery runbook
User quick-start
Design-partner onboarding guide

User quick-start should explain:

Sign in with GitHub
Redeem invitation
Create or import architecture
Review generated or inferred components
Run audit
Inspect evidence
Preview recommendation
Review diff
Apply only when appropriate
Rerun audit
Review simulation assumptions
Run simulation
Submit feedback

Keep trust statements visible:

Generated architecture requires review
Audits evaluate the represented architecture
Recommendations modify the product document only
Simulations are estimates
Docker Compose import is configuration-based
No infrastructure is executed or modified

──────────────────────────────────────────────────────────────────────────────

16. Checkpoint 3 testing

──────────────────────────────────────────────────────────────────────────────

Retain all existing tests.

Add focused tests for:

Health and readiness
Liveness does not access database
Readiness uses database in cloud mode
Readiness timeout
Readiness database error
Safe 503 body
No infrastructure leakage
Local-mode readiness
Environment validation
Valid production cloud configuration
Missing database URL
Missing migration URL where required
Missing auth secret
Placeholder auth secret
Missing GitHub credentials
Invalid application URL
Test auth in production
PGlite in production
Fake generation provider in production
Invalid quota values
Mismatched client/server mode
Missing legal configuration
PostgreSQL verification script
Refuses without verification mode
Refuses production by default
Allows explicit production confirmation
Uses verification prefixes
Cleanup targets only created records
Exits non-zero on failure
Does not print credentials
Invitation commands
Valid creation
Invalid email
Invalid duration
Missing database configuration
Token printed once
Hash never printed as token
Revocation
Access revocation where implemented
Bundle scan
Detects safe fake exposed secret
Does not print the fake value
Ignores allowed public client identifiers
Exits non-zero for exposure
Passes clean build output
Database connection
Pooler-compatible configuration
Prepared statement behavior where relevant
Client singleton/reuse behavior
PGlite excluded from production configuration
Logging
Prompt is not logged
ArchitectureDocument is not logged
Compose source is not logged
Feedback message is not logged
Tokens are not logged
Safe operation metadata remains

──────────────────────────────────────────────────────────────────────────────

17. Checkpoint 3 validation

──────────────────────────────────────────────────────────────────────────────

Before declaring Checkpoint 3 complete:

Run formatting
Run linting
Run strict type checking
Run all unit tests
Run all integration tests
Run health/readiness tests
Run environment configuration tests
Run invitation-command tests
Run PostgreSQL verification-script safety tests
Run bundle-scan tests
Run logging/privacy tests
Run relevant Playwright tests
Run the production build
Run verify:client-bundle
Run dependency-security review
Verify production fail-closed behavior
Verify PGlite cannot activate in production
Verify test auth cannot activate in production
Stop all temporary servers and databases

Do not require a live PostgreSQL database or live GitHub OAuth in automated
tests.

Do not falsely claim those have been live-verified.

At completion, report:

Files changed
Existing production behavior reused
Health and readiness behavior
Supabase runtime connection approach
Supabase migration connection approach
Prepared-statement compatibility
Vercel serverless compatibility
PostgreSQL verification command
Verification safety guards
Migration commands
GitHub OAuth staging checklist
Invitation and access-revocation commands
Production configuration requirements
AI generation safeguards
Client-bundle secret scan
Dependency-security findings
Logging and privacy rules
Backup and recovery runbook
Vercel + Supabase deployment guide
Operator documentation
User quick-start
Test results
Production-build result
Known limitations
Exact manual verification still required
Remaining Checkpoint 4 work
Any launch blockers

Classify Checkpoint 3 as:

PASSING
BLOCKED

Stop after Checkpoint 3.
```
