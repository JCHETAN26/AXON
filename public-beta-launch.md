Read all relevant repository documentation before modifying files, including:

- `CLAUDE.md`
- `docs/design/DESIGN.md`
- `DEPLOYMENT.md`
- Authentication and database documentation
- ArchitectureDocument documentation
- Audit documentation
- Recommendation documentation
- Simulation documentation
- Docker Compose import documentation
- Existing environment configuration
- Existing test and Playwright configuration

AXON currently has:

- Complete marketing website
- Prompt-to-architecture generation
- Blank and sample project creation
- Editable React Flow architecture canvas
- Versioned ArchitectureDocument
- Validated autosave
- Deterministic architecture audits
- Evidence-backed findings
- Finding reconciliation
- Deterministic recommendations
- Typed architecture-document patches
- Current / Recommended / Diff
- Explicit recommendation approval
- Audit rerun verification
- Deterministic architecture simulation
- Traffic and failure scenarios
- Simulation provenance, evidence and limitations
- Reviewed Docker Compose import
- Safe YAML handling and secret redaction
- GitHub authentication
- Invite-only beta access
- PostgreSQL persistence
- Owner-scoped project authorization
- IDOR protection
- Optimistic concurrency
- Generation quotas and rate limits
- Browser-local to cloud project migration
- Feedback collection
- Security headers
- Health and readiness behavior
- Production fail-closed configuration
- Authenticated cloud-mode browser tests
- More than 500 automated tests

Implement a single focused milestone:

# Launch-Ready Invite-Only SaaS Beta

The objective is to make AXON safe and usable for the first 3–10 real invited
beta users.

This milestone must complete:

1. Release-candidate security hardening
2. Route and authorization verification
3. Session-expiry and unsaved-work recovery
4. Production CSRF and content-security posture
5. Account and data lifecycle
6. Project export and recovery
7. User-facing trust and privacy surfaces
8. Production error and network-failure UX
9. PostgreSQL and GitHub deployment verification tooling
10. Operational readiness and release documentation
11. Accessibility, responsive and performance validation
12. Complete launch smoke tests
13. Final beta operator and user onboarding materials

Do not add new architecture-intelligence capabilities.

Do not implement:

- Billing
- Checkout
- Subscriptions
- Teams
- Organizations
- Collaboration
- Project sharing
- Public signup
- Anonymous cloud accounts
- Admin dashboard
- Repository access
- GitHub repository import
- Terraform import
- Kubernetes import
- Cloud-provider discovery
- Runtime monitoring integrations
- Production telemetry integrations
- Architecture version history
- Automatic infrastructure changes
- Infrastructure deployment
- A public API
- Mobile applications
- Third-party analytics
- New AI models
- New simulation models
- Additional diagram categories

First inspect the current working tree.

Before modifying files, report:

- Existing route map
- Existing authentication and beta-access boundaries
- Existing account functionality
- Existing session-expiry behavior
- Existing security headers and CSP status
- Existing health/readiness behavior
- Existing export or deletion functionality
- Existing legal/trust pages
- Existing production verification scripts
- Concrete gaps against this milestone
- A concise checkpoint plan

Do not rewrite completed subsystems unless a concrete defect is identified.

Execute the milestone in four checkpoints.

# Checkpoint 1 — Security, routing and recovery

Complete:

- Route-protection matrix
- HTTP-boundary authorization validation
- Session-expiry recovery
- Unsaved canvas recovery
- CSRF posture
- Content Security Policy decision
- Request and response hardening
- Cookie and session validation
- Security tests

Run format, lint, typecheck and relevant tests before continuing.

Do not begin Checkpoint 2 until Checkpoint 1 passes.

# Checkpoint 2 — Account and data lifecycle

Complete:

- Account settings
- Project export
- Account data export
- Project deletion hardening
- Account deletion
- Data-retention behavior
- Network and persistence failure UX
- User-facing trust and legal pages
- Associated tests

Run format, lint, typecheck and relevant tests before continuing.

Do not begin Checkpoint 3 until Checkpoint 2 passes.

# Checkpoint 3 — Production and operational readiness

Complete:

- Liveness/readiness verification
- Real PostgreSQL verification tooling
- GitHub OAuth staging checklist
- Migration safety
- Secret and browser-bundle scanning
- Production environment validation
- Backup and recovery runbook
- Deployment verification
- Operator documentation
- User quick-start documentation

Run format, lint, typecheck and relevant tests before continuing.

Do not begin Checkpoint 4 until Checkpoint 3 passes.

# Checkpoint 4 — Release validation

Complete:

- Full local test suite
- Full authenticated cloud-mode test suite
- Release smoke flow
- Accessibility checks
- Responsive checks
- Performance sanity checks
- Production build
- Release report

Stop after Checkpoint 4.

Do not begin another product feature.

──────────────────────────────────────────────────────────────────────────────

# CHECKPOINT 1 — SECURITY, ROUTING AND RECOVERY

──────────────────────────────────────────────────────────────────────────────

# 1. Final route-protection matrix

Enumerate every application route and classify it as:

- Public
- Authentication
- Authenticated but not beta-gated
- Authenticated and beta-gated
- Owner-scoped product route
- Internal API
- Public health endpoint
- Static asset
- Not found

Inspect the repository’s actual routes rather than assuming `/app` or
`/projects`.

Include all actual routes for:

- Marketing
- Sign-in
- Auth.js callbacks
- Invitation redemption
- Project list
- New project
- Project workspace
- Canvas
- Audit
- Recommendations
- Simulation
- Docker Compose import
- Feedback
- Generation
- Migration
- Account settings
- Health
- Readiness
- API routes

Create a route-protection matrix in code or tests.

Requirements:

- No private product route is accidentally public
- No public marketing route is accidentally gated
- Authentication callback routes remain reachable
- Health and readiness follow their documented accessibility
- Static assets are not blocked
- Proxy/middleware and server-page guards agree
- API routes independently validate authorization
- Local mode remains deliberate and documented
- Production cloud mode always requires authentication and beta access
- Invalid or inaccessible project IDs do not reveal ownership
- Redirect loops are prevented
- Malicious callback URLs are rejected
- Protocol-relative redirects are rejected
- External absolute redirects are rejected
- Hostname-prefix tricks are rejected
- Encoded redirect bypasses are rejected

Add tests for the complete route matrix.

# 2. HTTP-boundary authorization verification

Retain existing repository and route-core IDOR tests.

Add real browser or HTTP-stack validation where supported by the current
PGlite and test-auth setup.

Create:

- User A
- User B
- Authenticated non-beta user
- Unauthenticated context

Verify User B cannot:

- Open User A’s project page
- Read User A’s project API
- Rename User A’s project
- Save User A’s architecture
- Delete User A’s project
- Read User A’s audit
- Save User A’s audit
- Read User A’s recommendations
- Apply User A’s recommendation
- Read User A’s simulation profile
- Read User A’s latest simulation run
- Save User A’s simulation
- Read User A’s Compose import draft
- Apply User A’s Compose import
- Generate architecture for User A’s project
- Associate feedback with User A’s project
- Export User A’s project
- Delete User A’s account or data

Return safe not-found behavior where existence disclosure would be harmful.

Do not trust client-provided:

- User ID
- Owner ID
- Email
- Project ID without owner scoping
- Document owner
- Artifact owner
- Invitation owner

# 3. Session-expiry recovery

Inspect current behavior where a product request returns 401.

A direct redirect is insufficient when unsaved architecture edits exist.

Implement a centralized session-expiry coordinator.

Requirements:

- Detect structured unauthenticated responses
- Do not show Saved after a 401
- Do not show success after any rejected mutation
- Display one session-expiry recovery experience
- Do not create repeated dialogs for concurrent failed requests
- Preserve safe internal return path
- Never include architecture JSON in the URL
- Preserve unsaved canvas state where practical
- Preserve project identity
- Preserve the expected server revision
- Record the timestamp of the recovery state
- Allow the user to copy unsaved ArchitectureDocument JSON
- Allow explicit discard
- Allow sign-in again
- Restore focus correctly
- Prevent destructive operations from replaying automatically

Do not automatically replay:

- Recommendation application
- Compose import application
- Project deletion
- Account deletion
- Generation
- Local-to-cloud migration

After sign-in:

1. Reload current server project
2. Compare server revision with the recovery record
3. If unchanged, allow the user to resume or explicitly retry a safe save
4. If changed, show a revision conflict
5. Preserve recoverable local architecture JSON
6. Do not force-overwrite
7. Do not merge automatically

Use session-scoped storage only if required to survive the sign-in redirect.

Recovery storage must contain only the minimum required:

- Project ID
- Expected revision
- Valid ArchitectureDocument
- Safe route
- Recovery timestamp

Do not store:

- Provider tokens
- Invite codes
- Compose YAML
- Imported secret values
- Feedback
- Generation provider output
- OAuth details
- Unrelated project data

Expire stale recovery records using a named duration.

Add tests for:

- Session expiration while canvas is dirty
- No false Saved state
- One recovery dialog
- Safe return path
- Recovery survives sign-in redirect
- Server unchanged
- Server changed
- Copy JSON
- Explicit discard
- Invalid recovery record
- Expired recovery record
- Destructive action not replayed

# 4. Network and server-failure save behavior

Distinguish:

- Saved
- Saving
- Unsaved
- Offline or network unavailable
- Session expired
- Revision conflict
- Validation failed
- Server temporarily unavailable

Requirements:

- A timeout never displays Saved
- A network failure preserves in-memory edits
- Retrying is explicit or safely debounced
- Out-of-order save responses cannot overwrite newer state
- The UI clearly distinguishes account save from browser recovery
- A previous successful server version remains intact after failure
- Autosave has a bounded timeout
- Repeated failures do not flood the server
- Browser online/offline events may provide context but are not treated as
  proof that the server is reachable

Suggested copy:

“Changes are not saved to your AXON account yet.”

Provide:

- Retry save
- Copy architecture JSON
- Reload server version where appropriate

# 5. CSRF posture

Review every mutation route and server action.

Document for each operation:

- HTTP method
- Authentication mechanism
- Cookie behavior
- Origin validation
- Content-Type validation
- Payload schema
- Idempotency behavior
- Concurrency behavior

Cover:

- Invitation redemption
- Project creation
- Project rename
- Canvas save
- Project deletion
- Audit persistence
- Recommendation application
- Simulation-profile save
- Simulation-run save
- Compose import draft save
- Compose import application
- Generation
- Feedback
- Local-to-cloud migration
- Account deletion
- Data export request if stateful

Requirements:

- GET never mutates state
- JSON endpoints reject invalid content types
- Cross-origin mutation requests are rejected where appropriate
- Cookies use correct SameSite behavior
- Auth.js endpoints retain supported Auth.js CSRF handling
- Do not invent custom cryptographic protection unnecessarily
- Origin checks account for the configured application URL and safe deployment
  proxies
- Missing or malformed Origin behavior is documented for non-browser clients
- State-changing responses use `Cache-Control: no-store`

Add tests for:

- Wrong method
- Wrong content type
- Cross-origin request
- Missing session
- Missing beta access
- Invalid body
- Oversized body
- Valid same-origin request

# 6. Content Security Policy

Inspect whether CSP currently exists.

If it exists, verify it.

If it does not exist, attempt a safe production-compatible implementation.

The final policy should restrict:

- Default sources
- Scripts
- Styles
- Images
- Fonts
- Connections
- Frames
- Objects
- Base URI
- Form actions

At minimum target:

````text
default-src 'self'
object-src 'none'
base-uri 'self'
frame-ancestors 'none'
form-action 'self'

Adapt remaining directives to verified application requirements.

Requirements:

Do not use unsafe-eval
Minimize unsafe-inline
Prefer nonce or hash behavior when compatible with the current Next.js setup
React Flow must continue rendering
Node positioning must work
Next.js hydration must work
Auth.js must work
GitHub OAuth redirects must work
Fonts must load
Local and production assets must load
Light and dark mode must work
File upload and Compose import must work
API calls must work
No confidential environment values appear in the policy
Do not send contradictory frame policies

If a safe CSP cannot be implemented tonight without breaking the product:

Keep the other security headers
Document the precise limitation
Add a tracked follow-up item
Do not claim CSP is implemented
Do not introduce a broken partial policy
7. Security headers

Verify:

Strict-Transport-Security in production HTTPS only
X-Content-Type-Options: nosniff
Referrer-Policy
Permissions-Policy
Frame protection
Cross-Origin-Opener-Policy where compatible
Cross-Origin-Resource-Policy where compatible
Cache-Control on authenticated responses

Avoid conflicting or obsolete combinations.

Test headers on:

Marketing route
Sign-in
Invite
Product page
Authenticated API
Health
Readiness
Static asset where relevant
8. Cookie and session configuration

Verify production cookies are:

Secure
HttpOnly
Correct SameSite
Correct path
Not scoped to an unnecessarily broad domain

Verify:

Production requires a stable auth secret
There is no development-secret fallback in production
GitHub provider tokens are not returned to browser session data
Provider tokens are not stored unless required
Session payload contains only required identity fields
Signing out removes browser product access
Beta access is verified server-side
Owner authorization is not trusted from the session alone
Test-auth remains impossible in production
PGlite test driver remains unavailable unless explicitly configured outside
production
9. Request and response hardening

All custom API routes must validate:

Supported method
Authentication
Beta access
Owner access
Content-Type
Payload size
Request JSON
Domain schema
Expected revision where applicable

Add named payload limits for:

Project names
Project descriptions
ArchitectureDocument JSON
Audit data
Recommendations
Simulation profiles
Simulation results
Compose import drafts
Migration batches
Feedback
Generation prompts
Export requests

Responses must:

Use safe content types
Avoid ORM records
Avoid stack traces
Avoid SQL details
Avoid OAuth details
Avoid provider-response bodies
Use no-store for authenticated private data
Include safe request IDs where the current logging system supports them
10. Checkpoint 1 validation

Before continuing:

Run formatting
Run linting
Run strict type checking
Run security-focused unit tests
Run authorization integration tests
Run session-expiry component tests
Run relevant Playwright tests
Run production build
Verify CSP/header behavior
Report Checkpoint 1 results

Do not continue if:

A private route is public
A cross-user API succeeds
A session-expired save shows Saved
CSP breaks the application
Production test-auth can activate
Production can fall back to local mode

──────────────────────────────────────────────────────────────────────────────

CHECKPOINT 2 — ACCOUNT AND DATA LIFECYCLE

──────────────────────────────────────────────────────────────────────────────

11. Account settings

Add a restrained authenticated account settings page.

Use the repository’s actual route conventions.

Suggested route:

/account

Show:

GitHub display identity
Email only where available and appropriate
Private-beta access status
Account creation date
Generation usage
Data export
Delete account
Sign out

Do not show:

Internal user ID
OAuth token
Invite token
Invite hash
Database IDs
Provider credentials

Do not add profile-editing functionality that conflicts with GitHub-managed
identity.

12. Project export

Allow the owner to export one project.

Export a versioned JSON bundle.

Suggested shape:

type AxonProjectExport = {
  exportSchemaVersion: "1.0";
  exportedAt: string;
  productVersion?: string;
  project: {
    name: string;
    description?: string;
    status: string;
    startingPoint: string;
    createdAt: string;
    updatedAt: string;
  };
  architectureDocument: ArchitectureDocument;
  audit?: ValidatedAuditRun;
  recommendations?: ValidatedRecommendationCollection;
  simulationProfile?: ValidatedSimulationProfile;
  latestSimulationRun?: ValidatedSimulationRun;
  importSummary?: SafeImportSummary;
};

Requirements:

Verify project ownership server-side
Validate every domain record before export
Do not export ORM records directly
Do not export raw Compose YAML
Do not export secret-like imported values
Do not export OAuth data
Do not export invitation information
Do not export generation provider credentials
Do not export internal database metadata
Use a safe deterministic filename
Set an appropriate JSON content type
Set Content-Disposition
Use no-store
Handle missing optional artifacts
Add an explicit explanation that the export is an AXON model, not an
infrastructure backup

Suggested filename:

axon-<safe-project-name>-<date>.json
13. Account data export

Allow the authenticated user to export all user-owned AXON product data.

Include:

Safe account identity metadata
Projects
Architecture documents
Validated project artifacts
Generation-usage summary
Feedback records only where appropriate and legally safe
Migration metadata where useful

Exclude:

Passwords
OAuth tokens
Session cookies
Auth secrets
Invite hashes
Other users’ data
Database implementation fields
Internal logs
Provider credentials
Raw Compose secrets
Redacted values
Test fixtures

Requirements:

Owner identity comes from the server session
Export generation is bounded by payload limits
Use streaming or safe server generation if necessary
Large export failure is handled without partial success
Use a versioned export schema
Do not claim the export can restore an entire deployment
Clearly distinguish project-domain data from operational records

Do not build an asynchronous job queue solely for this beta.

If an account is too large for synchronous export, return a truthful supported
limit and document it.

14. Project deletion

Review existing project deletion.

Requirements:

Authenticate
Verify beta access
Verify ownership
Require explicit confirmation
Use project name or a confirmation phrase where appropriate
Reject stale or already-deleted project safely
Delete project architecture and project-scoped artifacts
Delete Compose import drafts
Preserve account-wide generation usage where required for abuse prevention
Preserve feedback unless the privacy policy says otherwise
Never delete another user’s data
Never partially report success
Redirect to project list only after confirmed completion

The UI must clearly state:

“This deletes the AXON project and its saved architecture data. It does not
change deployed infrastructure.”

15. Account deletion

Implement authenticated account deletion suitable for an invite-only beta.

This is a destructive operation.

Requirements:

Require recent authentication or explicit reauthentication where practical
Require an explicit confirmation phrase
Derive user identity from the session
Never accept a client-selected user ID
Delete all user-owned projects
Delete architecture documents
Delete audits
Delete recommendations
Delete simulation profiles and runs
Delete Compose import drafts
Delete migration mappings
Delete beta-access grant
Delete authentication sessions and accounts
Delete or anonymize feedback according to the documented policy
Retain only records that must remain for security or legal reasons, and
document them honestly
Do not retain architecture content
Do not retain raw prompts unless the documented policy explicitly requires it
Invalidate the active session
Sign the user out
Return to a public confirmation page

Do not implement a recoverable soft delete unless full restoration behavior is
also implemented.

Use a transaction where supported.

A failed transaction must not show account deletion success.

Suggested warning:

“Deleting your account permanently removes your AXON projects and saved
architecture data. AXON cannot restore them.”

Do not claim removal from database backups is immediate unless implemented.

16. Data-retention policy implementation

Document the actual behavior, not an aspirational policy.

Specify:

Project retention
Deleted project behavior
Account deletion behavior
Database backup retention if known
Generation-usage retention
Feedback retention
Authentication-session retention
Invite retention
Log retention
Browser-local project behavior
Session-recovery record expiration
Raw Compose source handling
Secret-redaction behavior

Where an exact production retention period is not yet configured:

State that clearly
Add a founder/operator configuration item
Do not invent a legal commitment
17. Trust and privacy pages

Add concise public pages:

Privacy
Terms
Security or Trust
Data Handling

Use actual route conventions.

Suggested routes:

/privacy
/terms
/security
/data-handling

These pages must be honest and product-specific.

Privacy page

Explain:

What account data is collected
GitHub authentication
Project and architecture data storage
Generation provider use
Feedback storage
Essential cookies
No sale of personal data
No advertiser access
Data export
Account deletion
Contact method
Effective date

Do not state regulatory compliance that has not been verified.

Do not claim:

SOC 2
HIPAA compliance
GDPR certification
ISO 27001
Zero retention by AI providers
End-to-end encryption
Data residency guarantees
Immediate backup deletion

unless actually implemented and documented.

Terms page

Include beta-appropriate terms:

Product is provided as a beta
Architecture outputs require review
Audits evaluate represented architecture
Recommendations modify AXON documents only
Simulations are estimates
Compose imports are configuration-based
No guarantee of uptime
No guarantee of architecture correctness
User responsibility for confidential information
Prohibited abuse
Account termination
Contact method

Do not create misleading legal guarantees.

Add a visible note in developer documentation that founder/legal review is
required before public availability.

Security or Trust page

Explain implemented safeguards:

GitHub authentication
Invite-only access
Owner-scoped projects
Server-side authorization
Optimistic concurrency
Secret redaction during Compose import
No infrastructure execution
Explicit recommendation approval
Production configuration guards
Export and deletion controls

Also state limitations:

Beta product
No formal security certification
No live cloud-account integration
No runtime verification
No production benchmarking
User review required
Data Handling page

Explain the evidence boundaries:

User-entered architecture
Imported configuration
Generated content
AXON defaults
Deterministic calculations
AI inference
Saved account data
Feedback
What is not attached automatically
18. Legal/trust review gates

Do not silently publish placeholder legal contact data.

Add required configuration for:

Product/company legal name
Support email
Privacy contact
Effective date
Governing jurisdiction only if explicitly configured

If values are missing:

Use clearly marked development placeholders outside production
Fail production validation or show an operator warning before launch
Do not expose fake company information
19. Essential-cookie transparency

AXON currently uses authentication cookies.

Document:

Authentication cookies are essential
No advertising cookies
No third-party analytics cookies unless future configuration changes
Sign-out behavior
Session duration at a high level

Do not add a decorative cookie banner if only essential cookies are used and the
final legal review does not require one.

Do not add analytics.

20. Product-level error boundaries

Add or verify:

Global public error page
Authenticated product error boundary
Project not-found state
Product unavailable state
Database unavailable state
Generation unavailable state
Import parsing failure state
Simulation failure state
Feedback failure state

Requirements:

No stack traces
No internal database detail
No provider-response body
No tokens
Safe retry where applicable
Public home navigation
Product navigation where session remains valid
Request/reference ID where useful
Unsaved-work recovery when applicable
21. Accessibility and mobile for account lifecycle

Ensure:

Account settings are keyboard-operable
Export actions have accessible labels
Destructive confirmations trap and restore focus
Confirmation inputs are properly associated
Error summaries receive focus
Status messages use restrained aria-live
Delete actions are not color-only
Mobile account layout has no overflow
Long project names wrap safely
Download actions work without mouse input
22. Checkpoint 2 validation

Before continuing:

Run formatting
Run linting
Run strict type checking
Run project-export tests
Run account-export tests
Run project-deletion tests
Run account-deletion tests
Run legal-page rendering tests
Run privacy data-boundary tests
Run relevant Playwright tests
Run production build
Report Checkpoint 2 results

Do not continue if:

Export leaks server secrets
Export includes another user’s data
Account deletion can target a client-supplied user ID
Account deletion partially succeeds and reports success
Legal pages contain unsupported compliance claims
Raw Compose secrets appear in an export

──────────────────────────────────────────────────────────────────────────────

CHECKPOINT 3 — PRODUCTION AND OPERATIONAL READINESS

──────────────────────────────────────────────────────────────────────────────

23. Liveness and readiness

Verify or split:

/api/health
/api/ready
Liveness

Requirements:

Does not require authentication
Does not depend on PostgreSQL
Returns quickly
Confirms the server process can respond
Exposes only safe build/version metadata
Does not reveal environment configuration

Suggested response:

{
  "status": "ok",
  "version": "safe-build-identifier"
}
Readiness

Requirements:

Does not expose credentials
Validates deployment configuration
Checks PostgreSQL in cloud mode
Uses a short named timeout
Returns 200 only when required dependencies are available
Returns 503 when unavailable
Does not expose database hostname, user, URL, schema contents or stack trace
Avoids expensive queries
Does not create database records
Handles local mode truthfully
Uses no-store

Add tests for:

Local readiness
Cloud readiness
Database success
Database timeout
Database rejection
Invalid production configuration
Safe response body
24. PostgreSQL verification tooling

Add a repeatable operator command:

pnpm verify:postgres

It should run only when explicitly enabled.

Require something such as:

AXON_VERIFICATION_MODE=staging

Refuse to run against production unless an additional explicit destructive
confirmation flag is provided.

The verification should safely test:

Connection
Migration availability
Auth user record creation
Invite creation
Invite redemption
Beta-access grant
Project creation
ArchitectureDocument JSONB persistence
Validated JSON read
Optimistic-concurrency conflict
Owner isolation
Audit persistence
Recommendation persistence
Simulation-profile persistence
Latest-run persistence
Import-draft persistence without secrets
Generation-usage lifecycle
Feedback persistence
Project deletion
Verification-record cleanup

Requirements:

Use unique verification prefixes
Never print database credentials
Never print raw auth secrets
Never print invitation hashes
Print the raw generated test invitation only when necessary and redact it
afterward
Do not delete unrelated data
Exit non-zero on failure
Clean generated records in a finally block where safe
Report which verification stage failed
Keep user-facing errors sanitized
25. Migration safety

Document and verify commands for:

Generate migration
Apply migrations locally
Apply migrations in staging
Apply migrations in production
Inspect migration status
Back up before migration
Recover from migration failure

Requirements:

Do not run destructive migrations automatically during normal page requests
Do not reset a production database
Mark test-only reset commands clearly
Verify whether migrations are transactional
Do not promise rollback if not supported
Allow generation to be disabled during operational work
Readiness should fail when required schema is unavailable where practical
26. Real GitHub OAuth smoke-test guide

Create a concise staging checklist.

Verify:

GitHub OAuth application is configured
Callback URL exactly matches the staging deployment
Application URL is correct
Only identity-related scopes are requested
Sign-in succeeds
Correct user is created or linked
Signing in does not grant beta access
Non-beta user reaches invitation redemption
Email-restricted invitation behaves correctly
Invitation redemption grants access
Original safe destination is restored
Malicious destinations are rejected
Product project persists
Sign-out removes access
Signing in again restores account projects
Provider token is absent from client session payload
Browser storage does not contain OAuth secrets

Do not automate live GitHub OAuth in CI.

27. Production environment validation

Centralize and validate production configuration.

Production invite-only cloud beta requires:

Explicit cloud persistence mode
PostgreSQL URL
Auth secret
GitHub OAuth client ID
GitHub OAuth client secret
Valid application URL
Public client persistence flag matching server mode
Generation feature flag
Valid AI provider
Valid AI model
Provider credential when generation is enabled
Positive monthly generation limit
Positive per-minute attempt limit
Positive concurrency limit
Legal/trust contact configuration
Safe build/version identifier where required

Reject:

Missing persistence mode
Local persistence in public production deployment
Missing database URL
Missing auth secret
Placeholder auth secret
Test authentication
PGlite production driver
Fake generation provider
Invalid URL
Unknown provider
Invalid limits
Mismatched client/server persistence flags
Missing GitHub credentials
Unsafe callback configuration
Placeholder legal contact values

Do not print secret values.

28. Secret and browser-bundle scan

Add a command such as:

pnpm verify:client-bundle

Run after production build.

Search generated browser artifacts for accidental inclusion of:

DATABASE_URL
AUTH_SECRET
GitHub client secret
AI-provider API keys
Test-auth password
Test-auth fixture identity where unsafe
Invite raw tokens
Invite hashes
Compose test secrets
Private database details
Explicit placeholder secrets
Server-only environment names combined with values

Requirements:

Do not print actual secrets
Use safe fingerprints or variable-name reporting
Distinguish public GitHub client ID from secret
Avoid obvious false positives
Exit non-zero on confirmed leakage
Document limitations of static scanning

Also inspect source maps if they are shipped publicly.

29. Dependency and build review

Run the repository’s appropriate dependency-security command.

Do not blindly apply major upgrades.

Report:

Critical vulnerabilities
High vulnerabilities
Runtime versus development-only findings
Whether a fix is available
Whether the fix is safe tonight
Deferred items

Requirements:

Fix critical exploitable runtime issues where possible
Avoid unrelated dependency churn
Do not break deterministic domain behavior
Do not claim a clean security audit when findings remain
30. Production logging and privacy

Review structured logging.

Allowed:

Request ID
Safe internal user subject
Project ID
Operation
Error code
Duration
Provider/model
Safe token counts
HTTP status

Prohibited:

Full prompts
ArchitectureDocument JSON
Compose YAML
Imported secret values
OAuth tokens
Session cookies
Invitation tokens
Invitation hashes
Feedback message body
Provider-response body
Environment values
Database URL

Add tests or safe logger wrappers preventing accidental sensitive logging.

31. Backup and recovery runbook

Document:

PostgreSQL backup expectation
Backup frequency to configure
Who is responsible
Restore verification
Backup access controls
How account deletion interacts with backups
How long deleted records may remain in backups if applicable
Generation disable switch
Database-unavailable behavior
OAuth outage behavior
AI-provider outage behavior
Deployment rollback
Migration failure response
Secret rotation
Invite revocation

Do not claim backups exist unless the selected deployment actually configures
them.

Separate:

Required operator setup
Application behavior
Future improvements
32. Staging-to-production deployment checklist

Document:

Provision PostgreSQL
Configure pooling if required
Configure environment
Configure GitHub OAuth
Apply migrations
Run PostgreSQL verification
Build application
Run bundle-secret scan
Deploy staging
Verify health
Verify readiness
Complete GitHub OAuth smoke test
Create email-restricted invitation
Complete AXON workflow
Test with second GitHub account
Confirm IDOR protections
Confirm generation quota
Confirm feedback
Confirm export
Confirm project deletion
Confirm session expiry
Review logs
Back up database
Deploy production
Repeat non-destructive smoke tests
33. Operator commands

Document or implement safe commands for:

Apply migrations
Inspect migration status
Create invitation
Revoke invitation
Verify PostgreSQL
Verify client bundle
Disable generation
Check readiness
Export user-owned data through product flow
Investigate feedback metadata without exposing project content

Do not build an admin dashboard.

34. User quick-start

Create a short guide suitable for invited users.

Suggested flow:

Sign in with GitHub
Redeem invitation
Create or import an architecture
Review every generated or inferred component
Run an audit
Open finding evidence
Preview a recommendation
Review Current / Recommended / Diff
Apply only when appropriate
Rerun the audit
Review simulation assumptions
Run a scenario
Submit feedback

Trust language must remain visible:

Generated architecture requires review
Audit findings evaluate the represented model
Recommendations modify the AXON document only
Simulations are estimates, not production benchmarks
Compose import reflects supplied configuration, not a running environment
35. Design-partner operator guide

Create an internal guide for onboarding 3–10 beta users.

For each user:

Confirm target profile
Generate email-restricted invitation
Set expiration
Send through a secure channel
Confirm redemption
Ask whether real or sanitized architecture will be used
Obtain explicit permission before observing a session
Do not request production secrets
Do not ask users to upload .env
Do not request cloud credentials
Explain architecture-data handling
Watch the user operate the product
Avoid leading them toward findings
Record confusion and false positives
Revoke unused invitations
Follow up after use
36. Design-partner session template

Capture manually:

User role
Team size
Company stage
Current architecture workflow
Input type
Time to valid architecture
Incorrect service classifications
Incorrect relationship inference
Time to first audit
First finding opened
Finding relevance
Evidence clarity
Recommendation usefulness
Diff trust
Apply or reject decision
Audit rerun result
Simulation assumption comprehension
First projected constraint usefulness
False positives
Missing findings
Blocking bugs
Trust concerns
Privacy concerns
Would use again
What AXON could replace

Do not record raw architecture content without explicit permission.

37. Private-beta success criteria

Document internal learning thresholds.

Suggested:

80% create or import a valid architecture
70% complete an audit
60% identify at least one relevant finding
50% understand the evidence without operator explanation
40% open a recommendation preview
30% apply a recommendation or clearly explain rejection
60% correctly understand simulation assumptions
Fewer than 20% of high-severity findings are judged obvious false positives
At least two users want to use AXON again

These are internal learning criteria.

Do not expose them publicly or present them as achieved metrics.

38. Checkpoint 3 validation

Before continuing:

Run formatting
Run linting
Run strict type checking
Run health/readiness tests
Run environment validation tests
Run bundle-scan tests
Run migration command safety tests
Run PostgreSQL verification-script guard tests
Run production build
Report Checkpoint 3 results

Do not continue if:

Production can start with unsafe configuration
Client bundle contains a server secret
Readiness leaks database details
Verification scripts can delete unrelated records
Test auth or PGlite can activate in public production

──────────────────────────────────────────────────────────────────────────────

CHECKPOINT 4 — RELEASE VALIDATION

──────────────────────────────────────────────────────────────────────────────

39. Canonical sample-project verification

Verify the Multi-Tenant SaaS reference project still demonstrates:

Readable architecture
Correct canonical nodes and edges
Deterministic audit findings
Evidence-backed findings
Recommendation linkage
Current / Recommended / Diff
Explicit recommendation approval
ArchitectureDocument-only change
Audit staleness
Audit rerun and expected resolution
Baseline simulation unsaturated
10× Traffic ranking PostgreSQL first
Visible database limiting dimension
Cache Degradation increasing database pressure
Worker Slowdown increasing RabbitMQ backlog
External dependency outage affecting only the payment path
Dark mode
Reduced motion
Mobile usability

Do not change deterministic expected behavior without documenting a verified
defect.

40. Full invite-only beta smoke flow

Create one documented and, where practical, automated sequence:

Public homepage
→ protected project route
→ sign in
→ invitation redemption
→ onboarding
→ create sample project
→ edit architecture
→ save
→ reload
→ audit
→ inspect evidence
→ preview recommendation
→ review diff
→ apply
→ rerun audit
→ run simulation
→ submit feedback
→ export project
→ sign out
→ sign in
→ verify persistence
→ second user cannot access project

Expected results must be documented.

41. Full Playwright coverage

Retain all current tests.

Add or extend tests for:

Public and authentication
Marketing homepage is public
Privacy page is public
Terms page is public
Security page is public
Data Handling page is public
Product route redirects signed-out user
Safe return path survives sign-in
Malicious return path is rejected
Non-beta user reaches invitation page
Valid invite grants access
Sign-out removes product access
Core product
Create project
Generate architecture with fake provider
Edit and save canvas
Reload persistence
Audit
Open evidence
Preview recommendation
Apply recommendation
Rerun audit
Run simulation
Docker Compose import
Ownership
User B cannot open User A’s project
User B cannot use project API
User B cannot access artifacts
User B cannot export project
User B cannot associate feedback
Inaccessible data appears missing
Concurrency and recovery
Two contexts open same project
First saves
Second conflicts
Second never displays Saved
Unsaved architecture remains recoverable
Session expiry preserves recovery record
Sign-in returns safely
Destructive operations are not replayed
Account and data
Project export downloads safe JSON
Export excludes secrets
Account export contains only owned data
Project deletion removes project
Account deletion requires confirmation
Account deletion signs user out
Deleted user cannot access product
Another user remains unaffected
Feedback
Feedback states what is not attached
Valid feedback persists
Feedback does not include architecture
Feedback does not include Compose YAML
Oversized feedback fails
Rate-limited feedback is safe
Deployment behavior
Security headers are present
Authenticated API uses no-store
Liveness reveals no secrets
Readiness reveals no infrastructure details
CSP does not break React Flow where implemented
Dark mode works
Reduced motion works
Mobile has no horizontal overflow at 390px
Keyboard-only primary flow works
Primary flows produce no browser console errors

Do not use:

Live GitHub
Live AI provider
Live production database
External cloud services
42. Accessibility review

Verify:

One clear page heading
Logical focus order
Visible focus states
Keyboard navigation
Accessible forms
Input errors associated with fields
Dialog focus trapping
Focus restoration
Non-color statuses
Reduced-motion behavior
aria-live restraint
Screen-reader summaries
Mobile navigation
Canvas keyboard access
Export and deletion actions
Session-expiry recovery

Fix concrete accessibility defects.

Do not redesign the interface.

43. Responsive review

Verify at minimum:

390px mobile
Tablet width
Standard laptop
Large desktop

Check:

Marketing
Sign-in
Invite
Onboarding
Project list
Canvas
Audit
Recommendations
Simulation
Import
Feedback
Account
Legal pages
Error pages

No horizontal overflow.

Do not shrink architecture diagrams into unreadable full-canvas thumbnails on
mobile. Use existing simplified or list behavior.

44. Performance sanity checks

Do not attempt premature large-scale optimization.

Inspect:

Production bundle size
Large client dependencies
Duplicate package copies
Unnecessary server dependencies in client bundles
React Flow route loading
Excessive repeated parsing
Excessive architecture serialization
Import parsing on every keystroke
Simulation reruns on every input
Repeated authenticated project requests
Readiness database load
Autosave request flooding

Fix obvious regressions.

Prefer:

Route-level loading
Existing memoization
Explicit simulation/import actions
Bounded autosave
Server-only database packages
No unnecessary global state library

Document remaining performance limitations.

45. Production build and secret verification

Run:

Formatting
Lint
Strict typecheck
All unit tests
All integration tests
All local E2E
All authenticated cloud E2E
Production build
Client-bundle secret scan
Route-protection tests
Canonical-sample tests
Dependency-security review

Stop all temporary servers and databases afterward.

46. Final release report

Report:

Files added or changed
Route-protection matrix
Authorization findings
Session-expiry recovery
Network failure recovery
CSRF posture
CSP decision
Security headers
Cookie and session configuration
Account settings
Project export
Account export
Project deletion
Account deletion
Data retention
Privacy/Terms/Security/Data Handling pages
Error boundaries
Health and readiness
PostgreSQL verification command
GitHub OAuth staging checklist
Production environment validation
Client-bundle secret scan
Dependency findings
Logging and privacy behavior
Backup/recovery runbook
Deployment checklist
Operator guide
User quick-start
Design-partner session template
Success criteria
Accessibility
Responsive behavior
Performance findings
Unit-test results
Integration-test results
Playwright results
Production-build result
Known limitations
Exact manual steps remaining before the first invitation is sent
47. Release decision

At the end, classify the build as one of:

READY FOR STAGING
READY FOR INVITE-ONLY BETA
BLOCKED

Do not classify it as READY FOR INVITE-ONLY BETA unless:

Production configuration fails closed
Authentication and beta gating work
Cross-user isolation is verified
Project data persists
Revision conflicts are safe
Session-expired edits are recoverable
No server secrets appear in client bundles
Health and readiness are safe
Project and account deletion work
Legal/trust pages contain no fabricated claims
The complete smoke flow passes

When blocked, provide the exact blocking issues.

Stop after this milestone.

Do not begin billing, teams, collaboration, public signup, Terraform,
Kubernetes, monitoring integrations, repository access, cloud discovery or a
new architecture feature.


## Is tonight realistic?

**Likely, yes**, provided:

- The existing implementation reports are accurate.
- Claude does not uncover a major architectural defect.
- You already have a deployment platform and PostgreSQL available.
- You can create a GitHub OAuth application and configure its callback URL.
- You have the AI-provider key.
- You review the privacy and terms wording before deployment.

The code can potentially reach **READY FOR STAGING** tonight. A trustworthy **READY FOR INVITE-ONLY BETA** decision also requires several manual checks against the deployed environment:

```text
Real PostgreSQL
+ real GitHub OAuth
+ production build
+ one test invitation
+ two separate GitHub accounts
+ full product workflow

Do not invite users merely because the unit tests pass. Complete that deployment smoke test first.
````
