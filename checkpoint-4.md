Now execute only:

# Checkpoint 4 — Complete Release Validation

Do not add any new product capability.

Do not redesign existing flows.

Do not rename the product or internal `AXON_*` configuration during this
checkpoint. Public branding will be finalized separately.

The purpose of this checkpoint is to verify the full invite-only SaaS beta,
repair concrete release-blocking defects, and issue an evidence-based release
decision.

Before modifying files:

1. Re-read the reports and implementation from Checkpoints 1–3.
2. Inspect the current working tree.
3. Report any uncommitted or suspicious changes.
4. List the complete release-validation plan.
5. Identify which validations require external manual infrastructure and cannot
   honestly be completed inside this environment.

Do not claim live Supabase PostgreSQL or GitHub OAuth verification unless those
external systems are actually used.

──────────────────────────────────────────────────────────────────────────────

# 1. Canonical reference-project validation

──────────────────────────────────────────────────────────────────────────────

Verify the canonical Multi-Tenant SaaS reference project still demonstrates the
complete product loop.

Confirm:

- The architecture renders correctly
- Nodes and edges are readable
- The editable canvas works
- Autosave works
- Reload preserves the architecture
- Deterministic audit runs successfully
- Findings contain valid evidence
- Findings link to represented components and relationships
- Recommendation generation remains deterministic
- Recommendation preview works
- Current / Recommended / Diff works
- Explicit approval is required
- Applying a recommendation changes only ArchitectureDocument
- The original audit becomes stale
- Rerunning the audit resolves the expected finding
- Simulation profile loads
- Baseline simulation remains unsaturated
- 10× Traffic ranks PostgreSQL as the first projected constraint
- The database limiting dimension is visible
- Cache Degradation increases database pressure
- Worker Slowdown increases RabbitMQ backlog
- External Dependency Outage affects only the represented payment path
- Unrelated authentication and observability paths remain unaffected
- Reduced-motion mode preserves all information
- Dark mode remains readable
- Mobile behavior remains usable

Do not change deterministic fixture expectations unless a concrete product
defect is proven.

Document any fixture change and why it was necessary.

──────────────────────────────────────────────────────────────────────────────

# 2. Full invite-only beta smoke journey

──────────────────────────────────────────────────────────────────────────────

Create one automated or documented smoke sequence covering:

````text
Public homepage
→ protected route
→ sign in
→ invitation gate
→ invitation redemption
→ onboarding
→ create sample project
→ edit architecture
→ save
→ reload
→ run audit
→ inspect evidence
→ preview recommendation
→ view Current / Recommended / Diff
→ apply recommendation
→ rerun audit
→ run simulation
→ submit feedback
→ export project
→ open account page
→ sign out
→ sign in again
→ verify persistence
→ verify another user cannot access the project

For every stage, define:

Expected browser behavior
Expected server behavior
Expected persisted state
Safe failure behavior

No step may rely on live GitHub OAuth or a live AI provider in automated tests.

Use:

Test-auth only in non-production mode
PGlite or the established isolated test database
Deterministic fake generation provider
Isolated browser contexts
Isolated browser storage

──────────────────────────────────────────────────────────────────────────────

3. Public and authentication Playwright coverage

──────────────────────────────────────────────────────────────────────────────

Verify:

Marketing homepage remains public
Privacy page remains public
Terms page remains public
Security / Trust page remains public
Data Handling page remains public
Health endpoint remains public
Readiness follows its documented accessibility
Protected product route redirects unauthenticated users
Safe internal return path survives authentication
External return URL is rejected
Protocol-relative return URL is rejected
Encoded redirect bypass is rejected
Backslash redirect bypass is rejected
Authenticated non-beta user reaches invitation redemption
Invalid invitation fails safely
Valid invitation grants beta access
Sign-in alone does not grant access
Sign-out removes product access
Signing in again restores previously persisted projects
Provider tokens never appear in client session data

──────────────────────────────────────────────────────────────────────────────

4. Core product Playwright coverage

──────────────────────────────────────────────────────────────────────────────

Verify:

Create blank project
Create sample project
Create prompt-based project using deterministic fake provider
Open editable canvas
Add a component
Move a component
Add a relationship
Edit component metadata
Save architecture
Reload architecture
Run audit
Open finding evidence
Acknowledge a finding
Preview recommendation
View Current
View Recommended
View Diff
Apply recommendation
Rerun audit
Confirm expected resolution
Open simulation
Run baseline
Run 10× Traffic
Run Cache Degradation
Run Worker Slowdown
Run External Dependency Outage
Open Docker Compose import
Paste a valid Compose document
Review classifications
Correct one classification
Exclude one relationship
Preview import
Apply import
Reload imported architecture

No tests may call:

Live AI providers
Docker
External registries
GitHub
Supabase
Remote cloud services

──────────────────────────────────────────────────────────────────────────────

5. Real HTTP-boundary ownership validation

──────────────────────────────────────────────────────────────────────────────

Using actual browser sessions and HTTP routes, create User A and User B.

Verify User B cannot:

Open User A’s project
Read User A’s project API
Rename User A’s project
Save User A’s architecture
Delete User A’s project
Read User A’s audit
Save User A’s audit
Read User A’s recommendations
Apply User A’s recommendation
Read User A’s simulation profile
Read User A’s simulation result
Save User A’s simulation
Read User A’s import draft
Apply User A’s import
Run generation for User A’s project
Associate feedback with User A’s project
Export User A’s project
Include User A’s project in account export
Delete User A’s account

Inaccessible resources must appear missing where appropriate.

Do not reveal:

The owner’s identity
Whether the project exists
Internal database IDs
Artifact IDs
Authorization details

Retain repository-level and route-core IDOR tests in addition to browser tests.

──────────────────────────────────────────────────────────────────────────────

6. Optimistic concurrency validation

──────────────────────────────────────────────────────────────────────────────

Open the same project in two browser contexts representing the same user.

Verify:

Both load the same revision
Context A modifies and saves
Context B modifies its stale copy
Context B save returns a revision conflict
Context B never displays Saved
Context B keeps its in-memory edits
Recovery JSON can be copied
Reloading the server version works
No automatic merge occurs
No force-overwrite option is offered
Delayed response from an older request cannot replace newer client state

Repeat conflict checks for:

Recommendation application
Docker Compose import application
Prompt-generation save

A stale destructive operation must not partially modify the architecture.

──────────────────────────────────────────────────────────────────────────────

7. Session-expiry and unsaved-work recovery

──────────────────────────────────────────────────────────────────────────────

Simulate session expiration while the canvas contains unsaved changes.

Verify:

Autosave receives a structured 401
Save state becomes session-expired
Saved is never shown
Exactly one recovery experience appears
The recovery record contains only allowed fields
The safe return route is preserved
Architecture JSON is not placed in the URL
The user can copy recovery JSON
The user can discard recovery explicitly
Sign-in-again flow works
Recovery survives the authentication redirect
Server state is reloaded afterward
Unchanged server revision supports safe manual retry
Changed server revision produces a conflict
Destructive operations are not automatically replayed
Expired recovery records are rejected
Corrupt recovery records are rejected
Another project cannot consume the recovery record

Check recovery behavior for:

Canvas save
Recommendation application
Compose import application
Generation
Project deletion
Account deletion

Only safe architecture-save recovery may be retried after explicit user action.

──────────────────────────────────────────────────────────────────────────────

8. Network and persistence failure validation

──────────────────────────────────────────────────────────────────────────────

Simulate:

Network offline
Request timeout
Database unavailable
500 response
503 response
Invalid persisted JSON
Storage quota failure
Browser storage unavailable
Out-of-order autosave responses

Verify the UI distinguishes:

Saved
Saving
Unsaved
Network unavailable
Session expired
Revision conflict
Validation failed
Server unavailable

Requirements:

No failure shows false success
In-memory edits remain available
The previous valid server version remains unchanged
Retry is explicit or safely bounded
Repeated failure does not flood the server
Internal errors are sanitized
Request IDs may be shown safely where supported

──────────────────────────────────────────────────────────────────────────────

9. Account and data lifecycle validation

──────────────────────────────────────────────────────────────────────────────

Verify:

Project export
Owner can export
Another user cannot export
Export schema validates
ArchitectureDocument validates
Optional artifacts validate
Safe filename is used
Correct content type is used
Content-Disposition is used
Cache-Control: no-store is used
Raw Compose YAML is excluded
Secret-like values are excluded
OAuth data is excluded
Invitation data is excluded
Database metadata is excluded
Export states that it is not an infrastructure backup
Account export
Contains only authenticated user data
Contains no other user data
Uses versioned schema
Validates every included domain object
Excludes tokens and sessions
Excludes invite hashes
Excludes database internals
Excludes provider credentials
Excludes internal logs
Handles optional artifacts
Handles supported size limits truthfully
Project deletion
Requires explicit confirmation
Deletes only the owned project
Removes project-scoped artifacts
Does not remove another user’s data
Does not alter real infrastructure
Failed deletion preserves data
Success is shown only after persistence confirmation
Account deletion

Use a disposable automated test user.

Verify:

Requires explicit confirmation
Identity comes from session
Client-selected user ID is ignored or rejected
Transaction completes atomically
Projects are removed
Architecture documents are removed
Artifacts are removed
Beta access is removed
Auth accounts and sessions are removed
Active session becomes unusable
User is signed out
Another user remains unaffected
Browser-local copies are not silently deleted
Failed transaction preserves the account
No false success appears

──────────────────────────────────────────────────────────────────────────────

10. Generation quota and rate-limit validation

──────────────────────────────────────────────────────────────────────────────

Verify through real HTTP routes:

Anonymous request rejected
Non-beta request rejected
Wrong project owner rejected
Feature-disabled request rejected
Valid beta request succeeds
Successful valid ArchitectureDocument consumes monthly quota
Failed provider request does not consume monthly quota
Failed request still counts toward per-minute limiting
Per-minute limit returns safe Retry-After behavior
Concurrent generation is rejected
Timeout releases concurrency state
Cancellation releases concurrency state
Abandoned request expires
Monthly reset is correct
Browser-supplied usage data is ignored
Provider credentials never appear in response
Provider body is sanitized
Quota UI updates after success
Quota reached blocks additional generation
Generation kill switch leaves other product functionality available

Use the configured deterministic fake provider only in non-production tests.

──────────────────────────────────────────────────────────────────────────────

11. Feedback validation

──────────────────────────────────────────────────────────────────────────────

Verify:

Feedback action is accessible from the product shell
The user sees what is not attached automatically
Category is required
Message is required
Maximum size is enforced
Safe plain text is used
Owned project association succeeds
Another user’s project association fails
Rate limiting works
Persistence failure does not show success
ArchitectureDocument is not attached
Prompt is not attached
Compose YAML is not attached
Simulation profile is not attached
Audit evidence is not attached
Screenshot is not attached
Console log is not attached
Success copy does not claim email delivery
Feedback body is not written to normal server logs

──────────────────────────────────────────────────────────────────────────────

12. Import safety validation

──────────────────────────────────────────────────────────────────────────────

Verify Compose import still:

Never runs Docker
Never runs shell commands
Never pulls images
Never reads .env
Never reads Dockerfiles
Never reads host-mounted paths
Never reads configs or secret files
Never resolves remote resources
Never calls an LLM
Never sends source to an external service
Rejects unsafe YAML
Rejects duplicate keys
Bounds aliases and nesting
Redacts secret-like values
Excludes secrets from storage
Preserves unresolved variables safely
Marks uncertain classifications
Allows user corrections
Does not infer dependencies from shared network alone
Does not silently replace an existing architecture
Requires explicit approval
Marks audit and simulation stale after successful import only

──────────────────────────────────────────────────────────────────────────────

13. Security validation

──────────────────────────────────────────────────────────────────────────────

Verify:

Production cannot use local persistence
Production cannot use PGlite
Production cannot use test-auth
Production cannot use fake AI provider
Production requires auth secret
Production requires GitHub credentials
Production requires PostgreSQL
Production requires legal configuration
Production requires valid generation limits
Production does not expose anonymous generation
All mutation routes use request guards
Cross-origin mutation requests fail
Unsupported content types fail
Oversized bodies fail
GET requests do not mutate state
Private responses use no-store
OAuth tokens are absent from client payloads
Server secrets are absent from rendered HTML
Server secrets are absent from browser bundles
Error responses contain no SQL or stack traces

Verify security headers:

CSP
HSTS in production
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
Frame protection
COOP/CORP where configured

CSP must not break:

Next.js hydration
React Flow
Node positioning
Fonts
Authentication
File upload
Dark mode
API calls

Confirm production CSP contains no unsafe-eval.

Document the existing unsafe-inline limitation accurately.

──────────────────────────────────────────────────────────────────────────────

14. Health, readiness and deployment tooling

──────────────────────────────────────────────────────────────────────────────

Verify:

/api/health does not access PostgreSQL
/api/health reveals no environment detail
/api/ready checks PostgreSQL in cloud mode
/api/ready times out safely
/api/ready returns 503 safely
/api/ready reveals no host, user or URL
Local readiness is truthful
Responses use no-store

Run and test guards for:

pnpm verify:postgres
pnpm verify:client-bundle
Database migration commands
Invitation creation
Invitation revocation
Beta-access revocation

Do not connect to live PostgreSQL unless configuration is explicitly supplied.

Do not claim live verification when only guards and mocked behavior were tested.

──────────────────────────────────────────────────────────────────────────────

15. Client bundle and dependency review

──────────────────────────────────────────────────────────────────────────────

Run the production build.

Then run:

pnpm verify:client-bundle

Verify client artifacts do not contain:

Database URLs
Migration URLs
Auth secret
GitHub client secret
AI-provider keys
Test-auth credentials
Invitation tokens
Invite hashes
Compose fixture secrets
Private database information
Server-only configuration values

Do not print actual secret values.

Run the repository’s dependency-security command.

Report:

Critical runtime findings
High runtime findings
Development-only findings
Transitive findings
Safe fixes applied
Findings deferred
Exact command used

Do not make broad dependency upgrades unrelated to release safety.

──────────────────────────────────────────────────────────────────────────────

16. Accessibility validation

──────────────────────────────────────────────────────────────────────────────

Review the complete invite-only beta journey using keyboard-only navigation.

Verify:

One clear heading per page
Logical focus order
Visible focus states
Accessible sign-in button
Invitation input and error association
Onboarding controls
Project creation
Canvas controls
Audit finding list
Recommendation preview
Diff controls
Simulation inputs
Compose import
Feedback dialog
Account settings
Export actions
Project deletion dialog
Account deletion dialog
Session-expiry dialog
Navigation menu
Legal pages
Error pages

Verify:

Dialog focus trapping
Focus restoration
Error summary focus
Non-color status communication
Restrained aria-live
Reduced-motion behavior
Screen-reader summaries
Accessible numerical units
Accessible disabled-action explanations

Fix concrete accessibility defects only.

Do not redesign the product.

──────────────────────────────────────────────────────────────────────────────

17. Responsive validation

──────────────────────────────────────────────────────────────────────────────

Validate at:

390px mobile
Tablet width
Standard laptop
Large desktop

Check:

Marketing
Sign-in
Invitation
Onboarding
Project list
Project creation
Canvas
Audit
Recommendations
Diff
Simulation
Compose import
Feedback
Account
Privacy
Terms
Security
Data Handling
Error pages
Session-expiry recovery

Requirements:

No horizontal overflow
No clipped dialogs
Long project names wrap
Account menu remains usable
Sign-out remains reachable
Export remains usable
Destructive confirmation remains usable
Technical metadata wraps safely
The architecture canvas is not reduced to an unreadable miniature
Mobile uses existing focused list or simplified topology behavior

Fix concrete responsive defects only.

──────────────────────────────────────────────────────────────────────────────

18. Performance sanity review

──────────────────────────────────────────────────────────────────────────────

Do not perform speculative large-scale optimization.

Inspect:

Production bundle size
Client/server dependency separation
PostgreSQL packages in client build
PGlite packages in client build
Duplicate dependencies
React Flow loading
Architecture serialization frequency
Autosave frequency
Repeated project fetches
Import parsing behavior
Simulation rerun behavior
Audit rerun behavior
Readiness database load
Generation timeout behavior
Large export behavior
Legal-page rendering
Unnecessary client components

Fix only clear regressions such as:

Parsing on every keystroke
Simulation on every input change
Unbounded autosave
Repeated identical API requests
Server-only packages in browser bundles
Excessive database-client creation
Blocking route-level dependencies

Document remaining limitations honestly.

──────────────────────────────────────────────────────────────────────────────

19. Documentation validation

──────────────────────────────────────────────────────────────────────────────

Verify documentation exists and agrees with implementation for:

Local development
Cloud mode
Supabase runtime connection
Supabase migration connection
Prepared statement behavior
Vercel deployment
GitHub OAuth callback
Database migrations
PostgreSQL verification
Client-bundle verification
Invitation creation
Invitation revocation
Beta-access revocation
Generation kill switch
Generation quota policy
Health and readiness
Backup responsibility
Database restore expectations
Secret rotation
Account deletion
Data retention
Privacy
Terms
Security limitations
User quick-start
Operator checklist
Design-partner onboarding
Known beta limitations

Remove contradictions and outdated statements.

Do not claim:

Live verification that did not occur
Backups that are not configured
Zero downtime
Formal compliance
Automatic infrastructure modification
Production benchmarking
Runtime discovery

──────────────────────────────────────────────────────────────────────────────

20. Full test execution

──────────────────────────────────────────────────────────────────────────────

Run:

Formatting
Linting
Strict type checking
All unit tests
All integration tests
All repository tests
All route-security tests
All authorization/IDOR tests
All local Playwright tests
All authenticated cloud-mode Playwright tests
Canonical sample-project invariant tests
Account lifecycle tests
Export tests
Session-recovery tests
Generation quota tests
Import safety tests
Accessibility tests
Responsive tests
Production build
Client-bundle secret scan
Dependency-security review

Stop and report BLOCKED when:

A test failure cannot be resolved safely
A security boundary fails
Cross-user data is accessible
Session recovery loses unsaved work
Account deletion is partially unsafe
Client secrets appear in browser output
Production fails open
The canonical product loop is broken
Legal pages contain unsupported claims

Do not hide or skip failing tests.

Do not delete tests merely to pass the release.

──────────────────────────────────────────────────────────────────────────────

21. Manual external verification checklist

──────────────────────────────────────────────────────────────────────────────

Produce the exact steps that remain outside the automated environment.

They must include:

Supabase
Create the project
Configure pooled runtime URL
Configure direct migration URL
Apply migrations
Run pnpm verify:postgres
Confirm database region and Vercel region are appropriately close
Confirm connection pooling behavior
Confirm backups or document their absence
Confirm readiness against real PostgreSQL
Vercel
Configure production environment variables
Deploy staging/preview
Check production build
Check health
Check readiness
Review security headers
Review logs
Verify generation timeout
Verify exports
Verify account deletion with disposable staging account
GitHub OAuth
Configure exact callback URL
Complete real GitHub sign-in
Verify identity-only scopes
Verify non-beta invite gate
Redeem an email-restricted invitation
Sign out and sign back in
Confirm provider token is absent from browser session
Confirm malicious return URL rejection
Two-account authorization test
Account A creates project
Account B attempts page access
Account B attempts API access
Account B attempts artifact access
Account B attempts export
Confirm safe not-found behavior
Complete production-like workflow
Create project
Save architecture
Reload
Run audit
Preview recommendation
Apply recommendation
Rerun audit
Run simulation
Submit feedback
Export project
Sign out
Sign in
Verify persistence

──────────────────────────────────────────────────────────────────────────────

22. Final release report

──────────────────────────────────────────────────────────────────────────────

Provide a structured final report containing:

Files changed
Regressions found and fixed
Canonical sample-project verification
Authentication-flow results
Beta-invitation results
Route-protection results
HTTP-boundary IDOR results
Server persistence results
Optimistic-concurrency results
Session-recovery results
Network-failure results
Audit results
Recommendation results
Simulation results
Compose-import results
Generation quota results
Feedback results
Project-export results
Account-export results
Project-deletion results
Account-deletion results
Privacy and legal-page results
CSP and security-header results
Health and readiness results
Environment-validation results
Client-bundle scan result
Dependency-security findings
Accessibility results
Responsive results
Performance findings
Documentation results
Formatting result
Lint result
Typecheck result
Unit-test result
Integration-test result
Playwright result
Production-build result
Known limitations
External manual checks remaining
Exact launch blockers, if any

──────────────────────────────────────────────────────────────────────────────

23. Release decision

──────────────────────────────────────────────────────────────────────────────

Classify the build as exactly one of:

READY FOR STAGING
READY FOR INVITE-ONLY BETA
BLOCKED

Use:

READY FOR STAGING

When all local and automated validation passes, but real Supabase PostgreSQL,
real GitHub OAuth, or deployed Vercel behavior still requires manual
verification.

READY FOR INVITE-ONLY BETA

Only when all automated checks pass and the report includes evidence that the
required external production-like verification has already been completed.

Do not classify the build as READY FOR INVITE-ONLY BETA merely because mocked
tests pass.

BLOCKED

When a security, privacy, persistence, data-loss, authentication, deployment,
or central product-loop issue remains.

When blocked, provide:

Exact blocking issue
Risk
Reproduction steps
Required resolution
Whether the issue affects staging or only beta release

Stop after the release decision.

Do not deploy automatically.

Do not begin another product feature.

Do not begin billing, teams, collaboration, public signup, Terraform,
Kubernetes, repository integrations, cloud discovery, monitoring integrations,
or rebranding.


## Expected result

Because Supabase, Vercel and real GitHub OAuth have not yet been connected, the honest result will probably be:

> **READY FOR STAGING**

That is a success.

After Checkpoint 4 passes, the remaining work is operational:

```text
Create Supabase project
→ configure runtime and migration URLs
→ apply migrations
→ run verify:postgres
→ configure GitHub OAuth
→ configure Vercel
→ deploy staging
→ complete real OAuth flow
→ test with two GitHub accounts
→ complete full product workflow
→ invite first external beta user

Do not invite external users until those real-environment checks pass.
````
