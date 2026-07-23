Checkpoint 4 is complete with the release decision:

READY FOR STAGING

The real Supabase PostgreSQL staging gate has also passed.

We are intentionally postponing Vercel deployment. The application will remain
local for now while using real Supabase PostgreSQL and real GitHub OAuth.

Execute only:

# LOCAL PRODUCTION-LIKE VALIDATION GATE

Do not deploy to Vercel.
Do not add product functionality.
Do not begin GitHub repository intelligence.
Do not replace Auth.js.
Do not replace Supabase PostgreSQL.
Do not print or expose secrets.

The intended environment is:

- Next.js application running on localhost
- Real Supabase PostgreSQL
- Real GitHub OAuth configured for localhost
- Private-beta invitation gating
- AI generation initially disabled
- PGlite and test authentication disabled

Before executing:

1. Inspect `.env.example`, `.env.local` loading behavior, Auth.js configuration,
   database configuration, invitation commands, health/readiness endpoints and
   operator documentation.
2. Confirm `.env.local` is ignored by Git.
3. Confirm the exact localhost GitHub callback route.
4. Confirm the exact development command.
5. Confirm the exact invitation creation and revocation commands.
6. Confirm no secret value will be printed.
7. Confirm PGlite cannot activate in this cloud-persistence session.
8. Confirm test authentication is disabled.
9. Confirm Supabase runtime traffic uses the pooled PostgreSQL connection.
10. Present the exact validation plan before running anything.

──────────────────────────────────────────────────────────────────────────────

# Stage 1 — Environment validation

──────────────────────────────────────────────────────────────────────────────

Validate that:

- AXON_PERSISTENCE_MODE is cloud
- NEXT_PUBLIC_AXON_PERSISTENCE_MODE is cloud
- DATABASE_URL is present
- AUTH_SECRET is present and non-placeholder
- AUTH_GITHUB_ID is present
- AUTH_GITHUB_SECRET is present
- AXON_APP_URL is exactly the supported localhost URL
- AXON_TEST_AUTH is disabled
- PGlite is not selected
- Generation is initially disabled
- Legal/trust configuration is valid
- No production secret is exposed to client code

Do not display values.

Report only whether each requirement is present and valid.

──────────────────────────────────────────────────────────────────────────────

# Stage 2 — Start local application

──────────────────────────────────────────────────────────────────────────────

Run the repository’s exact local development command.

Confirm:

- The server starts successfully
- No production configuration silently falls back to local persistence
- No PGlite database starts
- No test-auth route is active
- Supabase connection initialization succeeds
- No secrets appear in startup logs

Keep the server available for the remaining validation stages.

──────────────────────────────────────────────────────────────────────────────

# Stage 3 — Health and readiness

──────────────────────────────────────────────────────────────────────────────

Verify against localhost:

- `/api/health`
- `/api/ready`

Health must:

- Return 200
- Avoid depending on PostgreSQL
- Reveal no environment or database details
- Use no-store

Readiness must:

- Return 200
- Confirm real Supabase connectivity
- Reveal no database host, project reference, username, connection URL or SQL
- Use no-store

Stop if readiness fails.

──────────────────────────────────────────────────────────────────────────────

# Stage 4 — Public and protected routes

──────────────────────────────────────────────────────────────────────────────

Verify public access to:

- Homepage
- Sign-in
- Privacy
- Terms
- Security / Trust
- Data Handling
- Health
- Readiness

Verify a signed-out user attempting to access a protected product route is
redirected safely to sign-in.

Verify external, protocol-relative, encoded and backslash-based return URLs are
rejected.

──────────────────────────────────────────────────────────────────────────────

# Stage 5 — Real GitHub OAuth

──────────────────────────────────────────────────────────────────────────────

This stage requires manual browser interaction.

Provide me with a concise checklist and stop while I perform it.

The checklist must cover:

1. Open a protected route while signed out
2. Confirm redirection to sign-in
3. Continue with GitHub
4. Complete real GitHub OAuth
5. Confirm only identity access is requested
6. Confirm repository access is not requested
7. Confirm GitHub sign-in alone does not grant beta access
8. Confirm redirection to invitation redemption
9. Confirm the original safe internal destination is retained
10. Confirm GitHub access tokens are not present in client session data
11. Confirm OAuth secrets are absent from browser storage

Resume only after I confirm this manual stage passed.

──────────────────────────────────────────────────────────────────────────────

# Stage 6 — Real invitation flow

──────────────────────────────────────────────────────────────────────────────

Inspect and use the existing operator command to create an invitation restricted
to my GitHub account email and expiring in seven days.

The command may resemble:

`pnpm beta:invite --email <email> --expires-in 7d`

Use the exact implemented command.

Requirements:

- Use the real Supabase staging database
- Store only the token hash
- Print the raw token once
- Do not write the token to logs
- Do not print the token hash
- Do not create a reusable or non-expiring invitation

Provide the raw token only in the secure terminal output expected by the
operator command.

Then stop while I redeem it in the browser.

After I confirm redemption, verify:

- Beta access is persisted
- The invitation is marked consumed
- The same invitation cannot be redeemed twice
- Invalid invitations fail safely
- Signing out removes active session access
- Signing in again restores the beta-access grant
- Projects remain associated with the same account

──────────────────────────────────────────────────────────────────────────────

# Stage 7 — Complete local product workflow

──────────────────────────────────────────────────────────────────────────────

Guide me through and verify:

1. Create a sample project
2. Confirm server persistence
3. Open the architecture canvas
4. Add or modify a component
5. Save
6. Reload the page
7. Confirm the architecture persists
8. Restart the local Next.js server
9. Sign in again
10. Confirm the project still persists
11. Run deterministic audit
12. Inspect finding evidence
13. Preview a recommendation
14. View Current
15. View Recommended
16. View Diff
17. Explicitly apply the recommendation
18. Confirm only ArchitectureDocument changes
19. Confirm the previous audit becomes stale
20. Rerun the audit
21. Confirm the expected resolution
22. Review simulation assumptions
23. Run baseline
24. Run 10x Traffic
25. Run Cache Degradation
26. Run Worker Slowdown
27. Run External Dependency Outage
28. Submit feedback
29. Confirm architecture data was not attached automatically
30. Export the project
31. Confirm export excludes raw Compose YAML and secret-like values
32. Sign out
33. Sign in again
34. Confirm persistence

Also test one sanitized Docker Compose import.

Do not use real production secrets or confidential architecture.

──────────────────────────────────────────────────────────────────────────────

# Stage 8 — Local two-account ownership test

──────────────────────────────────────────────────────────────────────────────

This requires two real GitHub accounts or two isolated browser profiles.

Account A:

- Signs in
- Redeems beta invitation
- Creates a project

Account B:

- Signs in
- Redeems its own separate invitation
- Attempts to open Account A’s project
- Attempts to read the project API
- Attempts to modify the architecture
- Attempts to access audit data
- Attempts to access recommendation data
- Attempts to access simulation data
- Attempts to export the project
- Attempts to delete the project
- Attempts to run generation for the project

Expected behavior:

- All Account B attempts fail safely
- Account A’s identity is not revealed
- The project appears missing where appropriate
- Account A’s data remains unchanged

Provide exact browser and API steps, then stop while I execute them.

──────────────────────────────────────────────────────────────────────────────

# Stage 9 — Failure and concurrency checks

──────────────────────────────────────────────────────────────────────────────

Using disposable records, verify:

## Two-tab editing

- Open the same project in two tabs
- Save from Tab A
- Save stale content from Tab B
- Confirm revision conflict
- Confirm Tab B never displays Saved
- Confirm recovery options remain available

## Session expiry

- Create an unsaved architecture edit
- Invalidate or expire the session safely
- Trigger autosave
- Confirm session-expired state
- Confirm recovery survives
- Confirm no destructive action is replayed

## Database failure

Without damaging Supabase:

- Temporarily run a separate local process with an invalid database URL, or use
  an isolated failure test
- Confirm readiness returns 503
- Confirm no database information is revealed
- Restore the valid environment

## Deletion

- Delete one disposable project
- Confirm only that project is removed
- Export a disposable account
- Delete that disposable account
- Confirm its session becomes invalid
- Confirm the other account is unaffected

──────────────────────────────────────────────────────────────────────────────

# Stage 10 — Real Anthropic generation

──────────────────────────────────────────────────────────────────────────────

Do not enable generation until Stages 1–9 pass.

Then instruct me to configure:

- ANTHROPIC_API_KEY
- A verified supported ANTHROPIC_MODEL
- AXON_GENERATION_ENABLED=true
- AXON_GENERATION_MODE blank
- AXON_AI_PROVIDER=anthropic
- Daily limit 2
- Per-minute limit 2
- Concurrency limit 1

Do not ask me to paste the API key into chat.

After the server restarts, run exactly one controlled prompt generation.

Verify:

- Authentication is required
- Beta access is required
- Project ownership is required
- Model output validates
- The architecture is normalized
- The project persists
- Usage increments only after valid completion
- Provider credentials remain server-only
- Provider error bodies are sanitized
- Disabling generation leaves audit and simulation available

──────────────────────────────────────────────────────────────────────────────

# Stage 11 — Final local report

──────────────────────────────────────────────────────────────────────────────

Report:

- Environment validation result
- Local server result
- Supabase connectivity result
- Health result
- Readiness result
- Real GitHub OAuth result
- Invitation result
- Full workflow result
- Restart-persistence result
- Two-account isolation result
- Concurrency result
- Session-recovery result
- Export result
- Deletion result
- Docker Compose import result
- Real Anthropic generation result
- Client secret exposure review
- Known limitations
- Any blockers

Classify the local build as exactly one of:

- LOCAL PRODUCTION-LIKE VALIDATION: PASSING
- LOCAL PRODUCTION-LIKE VALIDATION: BLOCKED

Do not classify it as externally deployable merely because localhost passes.

Stop after the report.

Do not deploy.
Do not begin repository intelligence.
