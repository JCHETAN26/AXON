```text
Keep the invite-hardening implementation.

Do not revert it.

Also keep the unrelated AXON_AI_PROVIDER configuration fix.

Before beginning any new product development, reconcile the repository and live
Supabase database so the codebase has a clean, internally consistent baseline.

Execute only:

# REPOSITORY AND DATABASE RECONCILIATION GATE

Do not begin GitHub Repository Intelligence yet.
Do not add new product functionality.
Do not redesign authentication.
Do not deploy.
Do not print or expose secret values.

Current known state:

- Invite-hardening changes are currently uncommitted.
- The hardened implementation expects hashed, email-bound, expiring invitation
  tokens.
- Migration `0001` contains the required schema changes.
- Migration `0001` has not yet been applied to live Supabase.
- Therefore live invite redemption would currently fail because application code
  expects `token_hash`, but the live database does not contain that column.
- The AXON_AI_PROVIDER configuration fix should be retained.

Perform the following steps.

## 1. Inspect the working tree

Report:

- Current branch
- Modified files
- Untracked files
- Staged files
- Invite-related changes
- Migration-related changes
- AXON_AI_PROVIDER changes
- Any unrelated changes

Do not discard or overwrite anything.

Classify every changed file as:

- Invite hardening
- Migration
- AI-provider fix
- Unrelated
- Generated artifact
- Suspicious or unclear

Stop and report before proceeding if unrelated or unclear changes could be lost.

## 2. Review invite-hardening correctness

Verify that the implementation provides:

- Cryptographically random invitation tokens
- Only the token hash stored in PostgreSQL
- Raw token printed only once by the operator command
- Optional email binding
- Expiration
- Single-use redemption
- Revocation
- Safe handling of invalid, expired, consumed and revoked invitations
- Authenticated redemption
- Beta-access grant creation
- Transactional or atomic redemption behavior
- No invitation hash exposed to the client
- No raw token written to normal logs
- Safe replay behavior
- Owner and session identity derived server-side

Run the focused invite tests before applying the migration.

Do not weaken the implementation merely to match the older schema.

## 3. Inspect migration 0001

Report exactly what migration `0001` changes.

Verify that it:

- Adds the required invitation-hash fields
- Preserves any existing invitation records safely
- Handles nullable versus required fields correctly
- Adds indexes or uniqueness constraints where appropriate
- Does not expose raw tokens
- Does not destructively remove unrelated data
- Does not reset tables
- Is compatible with the current PostgreSQL version
- Uses the repository's established migration framework

Determine whether existing legacy invitations require:

- Migration
- Invalidation
- Revocation
- Explicit deletion

Do not fabricate compatibility for legacy plaintext invitations.

If legacy invitation records cannot be migrated securely, document that they
will be invalidated and new invitations must be issued.

## 4. Validate migration safety

Using an isolated test PostgreSQL database or established test fixture:

- Apply all migrations from a clean database
- Apply migration `0001` on top of the immediately prior schema
- Verify the resulting schema
- Run invite creation and redemption
- Verify second redemption fails
- Verify expired invitation fails
- Verify revoked invitation fails
- Verify wrong-email redemption fails
- Verify successful redemption creates access exactly once
- Verify unrelated users and projects remain unchanged

Run migration rollback testing only if the migration framework genuinely
supports it.

Do not claim rollback support otherwise.

## 5. Apply migration to live Supabase staging

Use the configured migration database URL.

Before applying:

- Confirm the target is the existing Supabase staging project
- Confirm verification mode is staging
- Confirm production-destructive mode is not enabled
- Confirm no secret value is printed
- Confirm the migration command uses the migration connection rather than the
  pooled runtime connection

Then apply migration `0001` using the repository's exact migration command.

Do not:

- Reset the database
- Truncate tables
- Manually edit the schema through the Supabase UI
- Delete unrelated data
- Run migrations from an application request

After applying:

- Inspect migration status
- Verify the expected invitation columns and constraints exist
- Verify all prior migrations remain recorded
- Verify `/api/ready` still passes
- Verify existing projects and users remain intact

## 6. Run live invitation verification

Against real Supabase staging, verify:

1. Create an email-bound invitation expiring in seven days
2. Confirm only its hash is persisted
3. Redeem it with the matching authenticated identity
4. Confirm beta access is granted
5. Confirm the invitation is marked consumed
6. Confirm the same token cannot be redeemed again
7. Confirm an invalid token fails safely
8. Confirm an expired token fails safely
9. Confirm a revoked token fails safely
10. Confirm a different email cannot redeem an email-bound token
11. Confirm invitation failures expose no token hash or database details
12. Confirm unrelated user and project data remains unchanged

Use disposable verification identities and records where practical.

Clean up only records created for this verification.

Do not print the raw token in the final report.

## 7. Run regression validation

Run:

- Formatting
- Lint
- Strict type checking
- Invite unit tests
- Invite integration tests
- Migration tests
- Authorization tests
- PostgreSQL verification
- Health and readiness tests
- Production build
- Client-bundle secret scan

Confirm the AXON_AI_PROVIDER fix remains correct and introduces no production
fallback or client-secret exposure.

## 8. Establish a clean baseline

After all tests pass:

- Stage only the reviewed invite-hardening changes
- Stage migration `0001`
- Stage the AXON_AI_PROVIDER fix
- Exclude generated files and secret files
- Confirm `.env.local` and other secret files remain ignored
- Show the proposed commit contents
- Create a clear commit only if repository policy permits automated commits

Suggested commit intent:

`Harden invitation lifecycle and align Supabase schema`

Do not push automatically.

Do not rewrite unrelated history.

## 9. Final report

Report:

- Files retained
- Files excluded
- Invite security behavior
- Migration contents
- Migration command used
- Live Supabase migration result
- Legacy invitation handling
- Live invite verification result
- Readiness result
- Regression-test results
- Production-build result
- Client-bundle scan result
- Commit created or exact commit still required
- Remaining limitations
- Any blocker

Classify this gate as exactly one of:

- RECONCILIATION GATE: PASSING
- RECONCILIATION GATE: BLOCKED

Stop after the reconciliation gate.

Do not begin Checkpoint 5.
```

# After reconciliation passes

Then enter plan mode for the full product.

The plan should not be a single enormous “build everything” task. The full product has four major layers:

```text
1. Truth acquisition
   Repository, IaC, cloud and telemetry discovery

2. Architecture intelligence
   Evidence reconciliation, auditing, drift and impact analysis

3. Change planning
   Simulation, cloud-provider alternatives and migration plans

4. Controlled action
   Proposed code/IaC changes and reviewable pull requests
```

The next implementation milestone should remain:

> **Checkpoint 5 — GitHub Repository Intelligence Foundation**

Its exact success condition:

```text
Install GitHub App on one selected repository
→ manually analyze supported files
→ infer components and directional relationships
→ attach file-and-commit evidence to every inference
→ let the user accept, reject or edit each proposal
→ preview Current / Proposed / Diff
→ explicitly apply a new ArchitectureDocument revision
```

Do not add webhooks, PR comments, cloud accounts or AWS-to-GCP migration in that same checkpoint. Repository discovery becomes the evidence foundation those later capabilities depend on.

So the decision is:

> **Keep the hardening, apply migration `0001`, clean the repo state, then begin full-product planning and Checkpoint 5.**

Since **Stage 11 completed successfully**, your current build is now:

> **LOCAL PRODUCTION-LIKE VALIDATION: PASSING**

You have validated the existing product against real Supabase, real GitHub OAuth, real invitations, real persistence, ownership isolation, failure recovery and the complete architecture workflow.

The next milestone is no longer deployment work.

# Next milestone: Checkpoint 5

## GitHub Repository Intelligence Foundation

This is where GitHub changes from:

```text
GitHub OAuth
→ identify the user
```

to:

```text
GitHub App
→ access repositories explicitly selected by the user
→ analyze supported repository evidence
→ generate an evidence-backed architecture
```

Keep the existing OAuth App. It remains responsible for login.

Create a separate GitHub App for repository access.

The first version should support this complete workflow:

```text
User signs in
→ connects GitHub repository
→ chooses one or more repositories
→ starts manual analysis
→ system inspects supported files safely
→ components and relationships are inferred
→ every inference shows file-level evidence
→ user accepts, rejects or edits findings
→ architecture proposal is previewed
→ user explicitly applies it
→ new ArchitectureDocument version is saved
```

For this checkpoint, do **not** add:

- Pull-request webhooks
- Continuous syncing
- AWS account access
- GCP account access
- Terraform migration generation
- Automatic code changes
- Pull-request creation
- Runtime telemetry
- Billing or teams

We first need to prove that repository evidence can reliably produce a trustworthy architecture.

---

# Paste this into Claude Code

````text
The existing product has completed:

- Checkpoints 1–4
- Real Supabase PostgreSQL verification
- Local production-like validation through Stage 11

Current status:

LOCAL PRODUCTION-LIKE VALIDATION: PASSING

The application remains local for now and uses:

- Local Next.js server
- Real Supabase PostgreSQL
- Auth.js with GitHub OAuth for identity
- Private-beta invitation gating
- Existing architecture generation, audit, recommendation and simulation systems

Now implement only:

# CHECKPOINT 5 — GITHUB REPOSITORY INTELLIGENCE FOUNDATION

The purpose of this checkpoint is to let an authenticated beta user explicitly
connect selected GitHub repositories, safely analyze supported repository
evidence and create a reviewable architecture proposal.

Do not deploy to Vercel.

Do not replace the existing GitHub OAuth App.

Do not expand the login OAuth token to access repositories.

Use a separate GitHub App for repository access.

Do not begin pull-request review, cloud discovery, runtime telemetry,
cross-cloud migration, Terraform generation, automatic code changes, billing,
teams or collaboration.

Do not execute repository code.

Do not clone repositories into persistent local directories unless there is a
concrete reviewed reason. Prefer bounded GitHub API reads.

Do not expose or persist GitHub App private keys or installation access tokens.

Before changing code:

1. Inspect the existing authentication, project, ArchitectureDocument,
   provenance, audit, import and persistence models.
2. Identify existing domain types that can be reused.
3. Report current GitHub OAuth behavior.
4. Confirm that OAuth remains identity-only.
5. Identify the database migrations required.
6. Present the proposed GitHub App connection architecture.
7. Present the repository-analysis security model.
8. Present the evidence and architecture-proposal schemas.
9. Present a concise implementation plan.
10. Stop if this checkpoint would require weakening existing security boundaries.

──────────────────────────────────────────────────────────────────────────────
# 1. Preserve the authentication boundary
──────────────────────────────────────────────────────────────────────────────

The product must maintain two separate GitHub concepts:

## GitHub OAuth App

Purpose:

- User authentication
- Basic profile and email identity

It must not receive repository scopes.

## GitHub App

Purpose:

- Explicit installation by the user
- Access only to repositories selected during installation
- Repository metadata and file-content analysis

Do not merge these credential flows.

Do not store GitHub installation access tokens.

Persist only safe installation references and repository metadata required to
request short-lived installation tokens server-side.

──────────────────────────────────────────────────────────────────────────────
# 2. GitHub App permissions
──────────────────────────────────────────────────────────────────────────────

Use the minimum permissions required for this checkpoint.

Required repository permissions should be limited to:

- Metadata: read-only
- Contents: read-only

Do not request:

- Repository administration
- Repository secrets
- Actions secrets
- Deploy keys
- Commit status write
- Pull-request write
- Issues write
- Webhook administration
- Organization administration
- Members
- Packages write
- Workflows write
- Contents write

Do not request account permissions unrelated to repository analysis.

Document the exact permissions and why each is necessary.

For this checkpoint, live webhooks are not required.

The GitHub App may use:

- Manual repository connection
- Manual sync
- Manual re-analysis

Webhook support belongs to a later checkpoint.

──────────────────────────────────────────────────────────────────────────────
# 3. GitHub App configuration
──────────────────────────────────────────────────────────────────────────────

Support server-only environment variables following current repository naming
conventions.

Conceptually, configuration will need:

- GitHub App ID
- GitHub App client ID where required
- GitHub App client secret where required
- GitHub App private key
- GitHub App slug or name
- Installation callback/setup URL
- Application base URL

Use the exact names established by the implementation.

Requirements:

- Private key remains server-only
- Private key supports safe multiline environment formatting
- Configuration values are never returned to the client
- Missing required configuration disables repository connection safely
- Production and local validation reject placeholder values
- Existing GitHub OAuth variables remain separate
- Client bundles contain no GitHub App secrets

Update `.env.example` with descriptions but no real values.

──────────────────────────────────────────────────────────────────────────────
# 4. Installation connection flow
──────────────────────────────────────────────────────────────────────────────

Implement a safe flow:

```text
Authenticated beta user
→ Connections page
→ Connect GitHub repository
→ server creates signed short-lived state
→ redirect to GitHub App installation
→ user selects repositories
→ GitHub returns installation identifier
→ server validates state and session
→ installation is associated with authenticated account
→ selected repositories become available
````

Requirements:

- User must be authenticated
- User must have active beta access
- State must be signed, short-lived and single-use
- State must bind the flow to the authenticated user
- External redirect targets must be rejected
- Installation ID from the callback must be verified through GitHub
- The server must verify the installation is accessible to the GitHub App
- Do not trust repository names or account names supplied by the browser
- Do not accept a client-selected user ID
- Do not expose installation access tokens
- Replaying the callback must fail safely
- Linking the same installation twice must be idempotent
- Another user must not claim an installation already bound to someone else
  without an explicit supported transfer flow

Add a product route such as:

```text
/settings/connections
```

Follow existing route conventions if different.

──────────────────────────────────────────────────────────────────────────────

# 5. Persistence model

──────────────────────────────────────────────────────────────────────────────

Create or extend structured persistence for:

## GitHub installation connection

Safe fields may include:

- Internal connection ID
- Authenticated owner ID
- GitHub installation ID
- GitHub account ID
- GitHub account login
- GitHub account type
- Connection status
- Connected timestamp
- Last verified timestamp
- Safe permissions snapshot
- Created and updated timestamps

Do not persist installation access tokens.

## Connected repository

Safe fields may include:

- Internal repository connection ID
- Installation connection ID
- GitHub repository ID
- Owner login
- Repository name
- Full name
- Default branch
- Visibility
- Archived status
- Repository URL for display
- Last analyzed commit SHA
- Last sync status
- Last sync timestamp
- Created and updated timestamps

Do not infer ownership from a repository name.

Use stable GitHub numeric repository IDs as the remote identity.

## Repository analysis run

Persist:

- Analysis-run ID
- Repository connection ID
- Requested-by user
- Commit SHA
- Status
- Started and completed timestamps
- Supported-file count
- Skipped-file count
- Evidence count
- Proposal ID
- Safe failure code
- Sanitized failure summary

Do not persist provider or GitHub credentials in analysis records.

## Repository evidence

Persist structured evidence with:

- Evidence ID
- Repository ID
- Commit SHA
- File path
- Optional start and end line
- Evidence type
- Parser or extractor identifier
- Safe normalized excerpt where appropriate
- Extracted fact
- Confidence
- Created timestamp

Never persist:

- Secret values
- Full `.env` contents
- Private keys
- Tokens
- Credentials
- Raw binary files
- Entire repository archives
- Unsupported large source files

## Architecture proposal

Create a domain type separate from ArchitectureDocument.

It should contain:

- Proposal version
- Source repository
- Source commit SHA
- Proposed components
- Proposed relationships
- Evidence references
- Confidence
- Conflicts
- Unresolved questions
- Suggested removals
- Suggested updates
- Created timestamp
- Proposal status

Valid statuses should include:

- Draft
- Ready for review
- Partially accepted
- Applied
- Rejected
- Stale
- Failed

Do not silently convert proposals into ArchitectureDocument records.

──────────────────────────────────────────────────────────────────────────────

# 6. Repository selection and refresh

──────────────────────────────────────────────────────────────────────────────

After installation, retrieve the repositories actually granted to the GitHub
App installation.

Display:

- Repository name
- Owner
- Visibility
- Default branch
- Archived status
- Last analysis status
- Last analyzed commit
- Last analyzed time

Allow the user to:

- Connect a granted repository
- Disconnect a repository
- Refresh the granted repository list
- Start manual analysis
- View prior analysis runs
- View evidence
- Review the latest proposal

Do not allow users to type arbitrary repository URLs and bypass installation
authorization.

When an installation’s repository selection changes on GitHub, manual refresh
must reconcile the local list.

Repositories no longer granted must become inaccessible for future analysis.

Previously accepted ArchitectureDocument versions should remain, but their
repository-derived evidence must be marked stale or disconnected.

──────────────────────────────────────────────────────────────────────────────

# 7. Safe repository inventory

──────────────────────────────────────────────────────────────────────────────

For manual analysis:

1. Resolve the repository’s default branch
2. Resolve the current commit SHA
3. Fetch a bounded file tree
4. Classify supported files
5. Skip unsupported files safely
6. Fetch only allowed files within configured limits
7. Run deterministic extractors
8. Create evidence records
9. Build a reviewable proposal

Use configurable limits for:

- Maximum repositories per user
- Maximum analysis runs per hour
- Maximum files examined
- Maximum individual file size
- Maximum aggregate downloaded bytes
- Maximum path length
- Maximum analysis duration
- Maximum evidence records
- Maximum proposal components and relationships

Initial conservative defaults may resemble:

```text
Connected repositories per user: 3
Manual analyses per repository per hour: 2
Files examined per analysis: 500
Individual text file size: 512 KB
Aggregate fetched content: 10 MB
Evidence records: 1,000
Proposal components: 100
Proposal relationships: 250
```

Keep limits configurable and validated.

Do not:

- Execute source code
- Execute package scripts
- Run package managers
- Run builds
- Run tests
- Run Docker
- Pull container images
- Run Terraform
- Run Helm
- Run Kubernetes tools
- Follow symlinks
- Resolve Git submodules
- Download Git LFS objects
- Read release assets
- Read repository secrets
- Read Actions secrets
- Fetch arbitrary external URLs referenced by the repository

Skip:

- Binary files
- Media
- Build artifacts
- Dependency directories
- Vendor directories
- Generated files
- Large lockfiles where they provide no useful evidence
- Minified bundles
- Source maps
- Cache directories

Document the skip rules.

──────────────────────────────────────────────────────────────────────────────

# 8. Initial supported evidence

──────────────────────────────────────────────────────────────────────────────

Implement deterministic extraction for a bounded first set.

## Project and dependency manifests

Support where practical:

- `package.json`
- `requirements.txt`
- `pyproject.toml`
- `go.mod`
- `pom.xml`
- `build.gradle` or `build.gradle.kts`
- `.csproj`
- `Gemfile`

Extract evidence for:

- Frameworks
- Database clients
- Cache clients
- Queue clients
- Cloud SDKs
- Observability libraries
- AI-provider SDKs
- Authentication libraries
- Web frameworks
- Background-job frameworks

Do not treat a dependency alone as proof that the service is actively used.

Dependency-only evidence should have lower confidence.

## Container files

Support:

- `Dockerfile`
- `Dockerfile.*`
- `compose.yml`
- `compose.yaml`
- `docker-compose.yml`
- `docker-compose.yaml`

Reuse the existing safe Docker Compose parser where possible.

Dockerfile analysis should be static and bounded.

Do not execute Docker.

## GitHub Actions

Support:

```text
.github/workflows/*.yml
.github/workflows/*.yaml
```

Extract evidence for:

- Build
- Test
- Container publishing
- Deployment target
- Infrastructure commands
- Cloud-provider authentication mechanism
- Environments
- Scheduled jobs

Do not expose secret values.

References such as `${{ secrets.NAME }}` may be stored only as a redacted
secret-reference fact, never as a value.

## Configuration references

Statically detect safe environment-variable names and configuration keys where
useful.

Examples:

- `DATABASE_URL`
- `REDIS_URL`
- `KAFKA_BROKERS`
- `AWS_REGION`
- `GOOGLE_CLOUD_PROJECT`

Store names only.

Never store resolved values.

## Source-level integration patterns

Implement bounded deterministic detectors for clearly identifiable patterns
such as:

- PostgreSQL/MySQL/MongoDB/Redis clients
- Kafka/RabbitMQ/SQS/Pub/Sub producers and consumers
- HTTP server routes
- External HTTP clients
- Stripe
- Auth providers
- S3/Cloud Storage clients
- OpenTelemetry
- Prometheus
- Common AI-provider clients

Use language-aware or syntax-aware parsing where practical.

Do not use fragile unrestricted regular expressions over every repository file.

Do not claim architecture certainty from imports alone.

──────────────────────────────────────────────────────────────────────────────

# 9. Evidence and confidence

──────────────────────────────────────────────────────────────────────────────

Every proposed component and relationship must reference one or more evidence
records.

Confidence should be derived from evidence strength.

Suggested levels:

- Confirmed
- High
- Medium
- Low
- Unresolved

Examples:

## Stronger evidence

- Docker Compose service definition
- Terraform or Kubernetes declaration when later supported
- Explicit client initialization
- Queue producer connected to a named queue
- Runtime route registration
- GitHub Action deployment target

## Weaker evidence

- Dependency listed in package manifest
- Environment-variable name
- README mention
- Framework convention

Do not present low-confidence evidence as fact.

The UI must visibly distinguish:

- Confirmed
- Inferred
- User-supplied
- Conflicting
- Unresolved
- Stale

Provide evidence links to:

- Repository
- Commit SHA
- File path
- Line range where available

Do not expose inaccessible private-repository links to another user.

──────────────────────────────────────────────────────────────────────────────

# 10. Architecture proposal construction

──────────────────────────────────────────────────────────────────────────────

Convert evidence into an ArchitectureProposal.

The proposal may use deterministic rules and an optional server-side AI
consolidation step.

If AI consolidation is used:

- It must receive only bounded redacted evidence
- Full repository files must not be sent by default
- Secret-like values must be removed
- The user must be told that repository-derived evidence may be sent to the
  configured model provider
- The user must explicitly enable that behavior
- The provider key remains server-only
- Model output must validate against a strict proposal schema
- One bounded repair attempt may be used
- Invalid output must fail safely
- Every AI-proposed entity must still reference supplied evidence
- The model must not invent unsupported components
- Provider output must never be treated as repository truth

The first implementation may remain fully deterministic if that is safer.

The proposal should reconcile duplicate evidence.

Example:

```text
package.json: `pg`
src/db/client.ts: PostgreSQL client initialized
compose.yml: `postgres` service

→ one PostgreSQL component
→ confidence: Confirmed
→ three evidence references
```

Relationships must require relationship-specific evidence.

Do not infer:

```text
Service A → Service B
```

merely because both exist in the same repository.

──────────────────────────────────────────────────────────────────────────────

# 11. Proposal review UI

──────────────────────────────────────────────────────────────────────────────

Create a review experience that shows:

- Analysis summary
- Source repository
- Commit SHA
- Files examined
- Files skipped
- Proposed components
- Proposed relationships
- Confidence
- Evidence
- Conflicts
- Unresolved questions
- Existing architecture comparison

For each proposed component or relationship, allow:

- Accept
- Reject
- Edit
- Mark unresolved
- View evidence

Allow bulk operations only when safe:

- Accept all confirmed items
- Reject all low-confidence items

Do not offer an indiscriminate “accept everything” action without warnings.

The user must be able to correct:

- Component type
- Technology
- Display name
- Relationship type
- Direction
- Protocol
- Optionality
- Confidence classification

Preserve the original proposal and user review decisions.

──────────────────────────────────────────────────────────────────────────────

# 12. Current / Proposed / Diff

──────────────────────────────────────────────────────────────────────────────

Reuse the existing architecture comparison system where possible.

Support:

- Current ArchitectureDocument
- Repository proposal after review
- Semantic diff

The diff should identify:

- Added component
- Removed component
- Updated component
- Added relationship
- Removed relationship
- Updated relationship
- Conflicting evidence
- Unresolved item

Applying the proposal must require explicit confirmation.

Applying must:

- Validate the resulting ArchitectureDocument
- Create a new document revision
- Use optimistic concurrency
- Never overwrite a newer version
- Mark existing audit and simulation artifacts stale
- Preserve proposal provenance
- Preserve evidence references
- Record the source repository and commit SHA
- Never modify the GitHub repository
- Never modify infrastructure
- Never create commits or pull requests

──────────────────────────────────────────────────────────────────────────────

# 13. Existing architecture reconciliation

──────────────────────────────────────────────────────────────────────────────

When the project already has an architecture:

- Do not replace it automatically
- Match repository-derived components conservatively
- Show possible matches
- Let the user confirm merges
- Preserve manually created components
- Preserve user annotations
- Preserve layout where practical
- Show repository evidence that conflicts with the current document

Examples:

```text
Current document says Redis.
Repository contains no current Redis evidence.

→ mark as “not observed in this repository analysis”
→ do not remove automatically
```

```text
Repository shows Kafka.
Current document has no Kafka component.

→ propose addition
```

Absence of evidence is not proof of absence.

──────────────────────────────────────────────────────────────────────────────

# 14. Manual sync and staleness

──────────────────────────────────────────────────────────────────────────────

For this checkpoint, implement manual sync only.

A user can request:

```text
Analyze latest default-branch commit
```

If the repository commit changed since the previous analysis:

- Create a new analysis run
- Preserve prior runs
- Mark older unapplied proposals stale
- Produce evidence against the new commit
- Show the source commit clearly

If the commit is unchanged:

- Avoid unnecessary analysis where safe
- Allow an explicit force re-analysis for parser upgrades
- Record why the analysis was rerun

Do not add scheduled jobs or webhooks yet.

──────────────────────────────────────────────────────────────────────────────

# 15. Disconnect and data lifecycle

──────────────────────────────────────────────────────────────────────────────

Support:

## Disconnect repository

- Stop future analysis
- Remove the active repository connection
- Revoke or remove local association
- Preserve previously applied ArchitectureDocument versions
- Mark repository provenance as disconnected
- Delete or retain raw evidence according to the documented policy
- Explain the behavior before confirmation

## Disconnect GitHub installation

- Disconnect all repositories under the installation
- Stop future GitHub API access
- Remove stored installation association
- Preserve accepted architecture history
- Mark evidence as disconnected
- Explain that uninstalling the GitHub App on GitHub may also be required

## Delete repository analysis data

Provide a user-controlled option to delete:

- Analysis runs
- Evidence records
- Unapplied proposals
- Repository metadata

Do not delete accepted ArchitectureDocument versions without explicit separate
action.

Update account export and account deletion to include the new records.

Update privacy and data-handling documentation accurately.

──────────────────────────────────────────────────────────────────────────────

# 16. GitHub API behavior

──────────────────────────────────────────────────────────────────────────────

Use a maintained GitHub API client where appropriate.

Requirements:

- Short-lived installation tokens
- Server-only token acquisition
- Timeouts
- Abort support
- Bounded retries
- GitHub rate-limit awareness
- Safe handling of 401, 403, 404, 409 and 429 responses
- Sanitized error messages
- No GitHub response bodies in normal logs
- No tokens in URLs
- No private file contents in logs
- No repository content in client responses unless required for evidence display
- Safe pagination limits
- Safe handling of renamed, transferred, archived or deleted repositories

Expose safe user-facing statuses such as:

- Connected
- Permission changed
- Installation unavailable
- Repository unavailable
- Rate limited
- Analysis failed
- Reconnection required

──────────────────────────────────────────────────────────────────────────────

# 17. Logging and privacy

──────────────────────────────────────────────────────────────────────────────

Allowed operational logs:

- Internal user subject
- Internal connection ID
- GitHub installation ID
- GitHub repository ID
- Analysis-run ID
- Commit SHA
- File counts
- Evidence counts
- Duration
- Safe error code
- HTTP status

Never log:

- GitHub App private key
- Installation access token
- OAuth token
- File contents
- Secret references with values
- `.env` contents
- ArchitectureDocument JSON
- Repository proposal JSON
- Raw GitHub API response bodies
- Private repository URLs containing credentials
- User source code

Add tests for log redaction.

──────────────────────────────────────────────────────────────────────────────

# 18. Routes and authorization

──────────────────────────────────────────────────────────────────────────────

Every repository-related route must require:

- Authenticated session
- Active beta access
- Ownership of the installation connection
- Ownership of the connected repository
- Ownership of the target project when applying a proposal

User B must not:

- List User A’s installations
- List User A’s repositories
- Analyze User A’s repository
- Read User A’s evidence
- Read User A’s proposal
- Apply User A’s proposal
- Disconnect User A’s repository
- Delete User A’s analysis data
- Associate User A’s repository with User B’s project

Use safe not-found behavior where appropriate.

Do not accept client-provided ownership identifiers as authority.

Use existing mutation guards, same-origin protections, content-type validation,
body-size limits and no-store behavior.

──────────────────────────────────────────────────────────────────────────────

# 19. Tests

──────────────────────────────────────────────────────────────────────────────

Retain all existing tests.

Add focused tests for:

## GitHub App configuration

- Missing configuration disables connection safely
- Placeholder configuration rejected
- Private key never reaches client
- OAuth and GitHub App variables remain separate
- Client bundle contains no GitHub App secrets

## Installation flow

- Auth required
- Beta access required
- Signed state required
- Expired state rejected
- Replayed state rejected
- State bound to correct user
- Installation verified against GitHub
- Idempotent reconnect
- Another user cannot claim installation
- Malicious callback target rejected

## Repository listing

- Only installation-granted repositories returned
- Repository IDs come from GitHub
- Removed permission handled
- Archived repository handled
- Pagination bounded
- Another user cannot list repositories

## Inventory safety

- File-count limit
- File-size limit
- Aggregate-size limit
- Binary files skipped
- Symlinks skipped
- Submodules skipped
- Git LFS objects skipped
- Generated directories skipped
- No code execution
- No external URL fetching
- Timeout and abort
- Rate-limit handling

## Extractors

Fixtures for:

- Node/TypeScript
- Python
- Go
- Java
- C#
- Dockerfile
- Docker Compose
- GitHub Actions

Verify:

- Dependency-only evidence receives lower confidence
- Explicit initialization receives stronger confidence
- Secret values are never retained
- Secret references are redacted
- Duplicate evidence reconciles
- Relationships require directional evidence

## Proposal

- Schema validates
- Every item has evidence
- Unsupported model output rejected
- Duplicate components merged safely
- Unresolved conflicts preserved
- Existing architecture not overwritten
- Absence of evidence does not remove components
- Applied proposal creates new revision
- Stale revision creates conflict
- Audit and simulation become stale after apply
- Repository is never modified

## Authorization

- User B cannot read User A’s connection
- User B cannot read User A’s repository
- User B cannot start analysis
- User B cannot read evidence
- User B cannot read proposal
- User B cannot apply proposal
- User B cannot disconnect repository
- User B cannot delete analysis data

## Lifecycle

- Repository disconnect
- Installation disconnect
- Analysis-data deletion
- Account export
- Account deletion
- Applied architecture preserved appropriately
- Disconnected provenance marked accurately

## UI

- Keyboard-accessible connection flow
- Evidence review
- Accept/reject/edit controls
- Diff navigation
- Destructive confirmations
- Mobile layout at 390px
- No horizontal overflow
- Reduced-motion support
- Safe failure states

──────────────────────────────────────────────────────────────────────────────

# 20. Local integration validation

──────────────────────────────────────────────────────────────────────────────

Do not require a live GitHub App in automated CI.

Use deterministic GitHub API fixtures for automated tests.

Add a manual local validation guide covering:

1. Create GitHub App
2. Configure localhost URLs
3. Configure minimum permissions
4. Install on one test repository
5. Select only that repository
6. Connect installation
7. Refresh repository list
8. Run manual analysis
9. Review evidence
10. Reject one inference
11. Edit one inference
12. Accept one inference
13. Preview Current / Proposed / Diff
14. Apply proposal
15. Verify new ArchitectureDocument revision
16. Verify repository remains unchanged
17. Rerun audit
18. Disconnect repository
19. Confirm future analysis is blocked
20. Confirm applied architecture remains

Use a non-sensitive test repository for manual validation.

──────────────────────────────────────────────────────────────────────────────

# 21. Documentation

──────────────────────────────────────────────────────────────────────────────

Create or update:

- GitHub App setup guide
- Local GitHub App validation guide
- Repository permissions explanation
- Repository analysis security model
- Supported files and languages
- Analysis limits
- Evidence and confidence model
- Proposal review guide
- Repository disconnect behavior
- Data retention behavior
- Privacy page
- Data Handling page
- Security / Trust page
- Account export documentation
- Account deletion documentation
- Known limitations

State clearly:

- GitHub OAuth is for identity
- GitHub App access is separately granted
- Only selected repositories are accessible
- Repository code is never executed
- Analysis is static and bounded
- Evidence may be incomplete
- Absence of evidence is not proof of absence
- Architecture proposals require review
- Applying a proposal modifies only the product document
- The repository and infrastructure are not modified
- Webhooks and continuous sync are not included yet
- Pull-request comments are not included yet
- Cloud accounts are not connected yet
- Runtime behavior is not observed yet

──────────────────────────────────────────────────────────────────────────────

# 22. Validation

──────────────────────────────────────────────────────────────────────────────

Before declaring Checkpoint 5 complete:

1. Run formatting
2. Run linting
3. Run strict type checking
4. Run all existing unit tests
5. Run all existing integration tests
6. Run all authorization and IDOR tests
7. Run GitHub App configuration tests
8. Run installation-flow tests
9. Run repository-inventory safety tests
10. Run extractor fixture tests
11. Run proposal-schema tests
12. Run proposal-application tests
13. Run disconnect and deletion tests
14. Run account export and deletion tests
15. Run accessibility checks
16. Run responsive checks
17. Run relevant Playwright tests
18. Run production build
19. Run client-bundle secret scan
20. Run dependency-security review
21. Stop temporary servers and test databases

Do not claim live GitHub App verification unless it was actually performed.

At completion, report:

- Files changed
- Database migrations
- GitHub OAuth boundary
- GitHub App architecture
- Requested permissions
- Installation flow
- Persistence model
- Repository inventory behavior
- Supported files
- Extraction behavior
- Evidence model
- Confidence model
- ArchitectureProposal schema
- Review experience
- Current / Proposed / Diff behavior
- Apply behavior
- Optimistic concurrency behavior
- Manual sync behavior
- Disconnect behavior
- Account export and deletion updates
- Authorization results
- Security limits
- Logging and privacy behavior
- Test results
- Production-build result
- Client-bundle scan result
- Known limitations
- Exact manual GitHub App validation still required
- Remaining future checkpoint work
- Any blockers

Classify Checkpoint 5 as exactly one of:

- CHECKPOINT 5: PASSING
- CHECKPOINT 5: BLOCKED

Stop after Checkpoint 5.

Do not begin webhooks, pull-request review, cloud discovery, Terraform
intelligence, runtime telemetry, cross-cloud migration or code generation.

````

# What Checkpoint 5 gives you

After this passes, the product will support:

```text
Prompt-to-architecture
Docker Compose-to-architecture
Repository-to-architecture
````

And repository-generated architectures will have something prompt-generated architectures do not always have:

> **Concrete evidence tied to files and commits.**

After Checkpoint 5, the recommended order is:

```text
Checkpoint 6 — Terraform and Kubernetes Intelligence
Checkpoint 7 — Architecture Snapshots and Drift
Checkpoint 8 — GitHub Pull-Request Architecture Reviews
Checkpoint 9 — AWS-to-GCP Migration Workspace
Checkpoint 10 — Read-only Cloud Discovery
Checkpoint 11 — Runtime Telemetry and Calibrated Simulation
Checkpoint 12 — Controlled Infrastructure Pull Requests
```

The immediate action is to run the Checkpoint 5 prompt.
