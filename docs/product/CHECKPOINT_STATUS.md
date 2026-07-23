# Checkpoint Ledger & Status

> **Independent verification pass — 2026-07-23.** The prior version of this
> ledger listed Checkpoints 1–12 as `PASSING`/"completed". A verification pass
> against the actual repository found that overstated. This ledger now records
> honest per-checkpoint status using the contract vocabulary
> (`NOT_STARTED`, `IN_PROGRESS`, `AUTOMATED_VALIDATION_PASSING`,
> `MANUAL_VALIDATION_REQUIRED`, `PASSING`, `BLOCKED`, `DEFERRED`).
>
> **What the verification pass fixed:**
> - Added migration **`0003_checkpoints_6_to_12`** creating the 8 CP6–12 tables
>   that existed in `schema.ts` but in **no migration** (snapshots, drifts, PR
>   runs, cloud connections/runs, telemetry sources/metrics, generated infra
>   PRs). Neither the test DB nor a real DB previously had them.
> - Replaced the fake/mock database tests for all five new services
>   (snapshots, cloud discovery, telemetry, pull-request, infrastructure-PR)
>   with **real migrated-DB integration tests** including owner-isolation. The
>   fakes had been masking the missing tables. This surfaced and fixed a real
>   foreign-key bug in the infrastructure-PR service.
>
> **Current gate:** typecheck 11/11 · lint 11/11 · `pnpm test` green (web 555,
> ui 27, repo-intel 60, mcp-server 29, architecture-cost 9, all packages) ·
> production build compiles · client-bundle secret scan clean.
>
> **Not yet done / known gaps** (see per-checkpoint notes):
> - The full-scope Module 0 documentation set now exists under `docs/product/`:
>   blueprint, principles, domain model, roadmap, trust/provenance, integration
>   security, known limitations, manual validation, competitor parity, and this
>   checkpoint ledger.
> - Migrations `0000`–`0004` are **applied to live Supabase** (via the pooler;
>   `db:migrate` now uses `scripts/migrate.ts` — see `docs/ops/migrations.md`).
>   Live schema matches the code (29 public tables).
> - **Checkpoint 8** security core (webhook + HMAC signature + delivery dedup +
>   PG-backed jobs) is now built and tested, but analysis is still shallow (empty
>   proposal, extension-based risk) and the job dispatch is not wired → **IN_PROGRESS**.
> - **Checkpoints 10 and 11** persist correctly but use **hardcoded mock data**
>   for the actual cloud discovery / telemetry calibration → **IN_PROGRESS**.
> - **Checkpoint 5** is only partially built (Phase A committed; B–D
>   incomplete) → **IN_PROGRESS**. It is the real dependency for CP6–12.
> - No checkpoint has completed its **manual validation gate** (live GitHub
>   App, live cloud, live telemetry), so none is fully `PASSING`.

| Checkpoint | Status | Scope |
| --- | --- | --- |
| 1 | AUTOMATED_VALIDATION_PASSING | Core architecture canvas & schema (foundational; automated tests pass) |
| 2 | AUTOMATED_VALIDATION_PASSING | Deterministic audit & finding model |
| 3 | AUTOMATED_VALIDATION_PASSING | Traffic & failure simulation engine |
| 4 | AUTOMATED_VALIDATION_PASSING | Proposal review & Current/Proposed/Diff |
| 5 | IN_PROGRESS | GitHub Repository Intelligence Foundation (Phase A committed; B–D incomplete) |
| 6 | AUTOMATED_VALIDATION_PASSING | Terraform & Kubernetes intelligence (deterministic logic; workspace/DB flow not fully verified) |
| 7 | AUTOMATED_VALIDATION_PASSING | Architecture snapshots & drift (service now real-DB integration-tested) |
| 8 | IN_PROGRESS | GitHub PR reviews — webhook/security core now built + tested; evidence-based analysis + Check Run gating still shallow |
| 9 | AUTOMATED_VALIDATION_PASSING | AWS-to-GCP migration workspace (deterministic catalog/engine) |
| 10 | IN_PROGRESS | Read-only cloud discovery (persistence verified; discovery uses mock assets, no real cloud reads) |
| 11 | IN_PROGRESS | Runtime telemetry & calibrated simulation (persistence verified; calibration ignores ingested metrics) |
| 12 | AUTOMATED_VALIDATION_PASSING | Controlled infrastructure PRs (codegen + DB verified; live PR creation is a manual gate) |
| 13 | IN_PROGRESS | Local MCP and fully local mode (local boundary/analyzer/watcher, agent UI/API, sync metadata, and MCP tool subset exist; core scope remains partial) |
| 14 | IN_PROGRESS | Cloud cost intelligence (deterministic cost model + MCP estimate tool; UI/persistence/manual gates incomplete) |
| 15 | IN_PROGRESS | Visual Architecture Studio (icon registry foundation started) |
| 16 | IN_PROGRESS | Full multi-cloud workspace (curated planner + first UI slice) |
| 17 | IN_PROGRESS | Collaboration, sharing, and presentation (permission/share-link foundation) |
| 18 | IN_PROGRESS | Grounded architecture copilot (grounding contract foundation) |
| 19 | IN_PROGRESS | Benchmarks, security, and scale (versioned benchmark corpus foundation) |
| 20 | IN_PROGRESS | Production release and launch (release-readiness gate classifier) |

> Note on numbering: this repo also documents a separate "Public Beta Launch"
> checkpoint series (security, account lifecycle, production readiness) in
> `checkpoint-*.md`. The CP1–4 rows above describe foundational product
> capabilities whose automated tests pass; the two numbering schemes should be
> reconciled in a future pass.

---

## Module 0 — Baseline Reconciliation and Orchestration

- **Status**: `IN_PROGRESS`
- **Verified on 2026-07-23**:
  - Added the missing full-scope product documentation set required by
    `full-scope-plan.md`:
    - `FULL_PRODUCT_BLUEPRINT.md`
    - `PRODUCT_PRINCIPLES.md`
    - `DOMAIN_MODEL.md`
    - `MODULE_ROADMAP.md`
    - `TRUST_AND_PROVENANCE.md`
    - `INTEGRATION_SECURITY.md`
    - `KNOWN_LIMITATIONS.md`
    - `MANUAL_VALIDATION.md`
    - `COMPETITOR_PARITY_SCORECARD.md`
  - The docs distinguish tested foundations from live/manual/product-complete
    behavior and keep `CHECKPOINT_STATUS.md` as the durable ledger.
- **Known gaps**:
  - Live migration reconciliation has only been recorded through migration
    `0004`; newer migrations `0005`-`0007` still need operator validation
    against live Supabase before Module 0 can be promoted.
  - Repo-wide `format:check` still reports historical formatting drift outside
    the scoped implementation surface.
  - Dependency audit has not completed in this pass: sandboxed `pnpm audit
    --audit-level moderate` failed with DNS `ENOTFOUND`, and unsandboxed audit
    requires explicit user authorization because it sends dependency metadata to
    the npm registry.

## Checkpoint 5 — GitHub Repository Intelligence Foundation

- **Status**: `IN_PROGRESS`
- **Done**: Phase A committed (`d80a9f3`) — GitHub App config, single-use install
  state, owner-scoped connection repository, install flow, `/settings/connections`.
- **Not done**: Phase B (repo-intel extractors + safe inventory pipeline is
  partially present but not wired end-to-end), Phase C (proposal review UI +
  apply), Phase D (lifecycle/export/deletion/docs/full gate).

## Checkpoint 6 — Terraform and Kubernetes Intelligence

- **Status**: `AUTOMATED_VALIDATION_PASSING`
- **Verified**: HCL parser, Terraform resource catalog, relationship extraction,
  Kubernetes extractor + selector matching, and cross-source reconciliation are
  implemented in `@axon/repo-intel` with passing unit tests. No `child_process`/
  `exec` in the package (no-execution boundary respected).
- **Not verified**: the IaC review workspace end-to-end against a real DB, and
  the manual fixture-repository validation (§6.12).

## Checkpoint 7 — Architecture Snapshots and Drift

- **Status**: `AUTOMATED_VALIDATION_PASSING`
- **Verified**: `SnapshotService` now has real migrated-DB integration tests:
  immutable chained snapshots, deterministic semantic hash + diff, restore-as-
  new-revision, and owner-isolation. Migration `0003` creates
  `architecture_snapshots` / `architecture_drifts`.
- **Not verified**: full history/drift UI and the manual validation flow (§7.10).

## Checkpoint 8 — GitHub Pull-Request Architecture Reviews

- **Status**: `IN_PROGRESS`
- **Security core now built + tested (§8.2/§8.3)**:
  - **Webhook endpoint** `POST /api/github/webhook` with **HMAC-SHA256 signature
    verification** (timing-safe; sha1 rejected; no-secret ⇒ 503), content-type
    and body-size limits, an event allowlist, and sanitized logging that never
    records the payload/secret/content.
  - **Delivery-ID deduplication / replay protection** via a unique
    `github_webhook_events.delivery_id`; a replayed delivery is an idempotent
    no-op.
  - **PostgreSQL-backed job system** (`background_jobs`) with idempotent enqueue
    (keyed on delivery id), atomic lease/claim (`FOR UPDATE SKIP LOCKED`), retry
    with a bound, and a dead-letter state. Duplicate deliveries never create a
    second job.
  - **Server-side ownership resolution** — the owner is derived from the
    installation → connected repository, never trusted from the payload's names;
    unowned or unconnected events are ignored.
  - Migration `0004_webhook_and_jobs`. Tests: signature (valid/invalid/missing/
    tampered/sha1/no-secret), route gates, dedup/ownership/enqueue, job
    lifecycle — all real-DB where applicable.
- **Remaining gaps**:
  - Analysis is still **shallow**: the proposal is empty and risk is guessed
    from file extensions, not a real semantic diff over changed evidence (§8.5).
    The job **processor/dispatch** to the analysis services is not yet wired.
  - `postPrReviewComment` still posts to GitHub without the required disabled
    feature-flag + permission-upgrade gate (§8.1/§8.7).
  - A live GitHub App webhook configuration remains a manual validation gate.

## Checkpoint 9 — AWS-to-GCP Migration Workspace

- **Status**: `AUTOMATED_VALIDATION_PASSING`
- **Verified**: versioned AWS→GCP capability catalog and deterministic
  transformation/equivalence engine in `@axon/repo-intel` with passing unit
  tests; model-to-model only (no cloud mutation).
- **Not verified**: workspace end-to-end and manual validation.

## Checkpoint 10 — Read-only Cloud Discovery

- **Status**: `IN_PROGRESS`
- **Verified**: `cloudConnections` / `cloudDiscoveryRuns` tables (+ migration),
  owner-scoped `CloudDiscoveryService` with real-DB integration tests, and a
  pure reconciliation engine.
- **Gap**: `runDiscovery` returns **hardcoded mock cloud assets** — it does not
  read AWS/GCP. Real read-only cloud discovery (and its manual gate) is not
  implemented.

## Checkpoint 11 — Runtime Telemetry and Calibrated Simulation

- **Status**: `IN_PROGRESS`
- **Verified**: `telemetrySources` / `telemetryMetrics` tables (+ migration),
  owner-scoped `TelemetryService` with real-DB integration tests (register,
  ingest), and a pure telemetry calibrator in `@axon/architecture-simulation`.
- **Gap**: `getCalibratedCapacityProfile` **ignores ingested metrics** and
  calibrates from hardcoded mock samples — calibration is not yet driven by real
  telemetry.

## Checkpoint 12 — Controlled Infrastructure Pull Requests

- **Status**: `AUTOMATED_VALIDATION_PASSING`
- **Verified**: deterministic Terraform/Kubernetes code generator, owner-scoped
  `InfrastructurePrService` with real-DB integration tests (generation + record
  + owner-isolation), `generatedInfrastructurePrs` table (+ migration). Files
  are generated and a PR is recorded; nothing is executed.
- **Manual gate**: actual GitHub branch/PR creation
  (`createBranchAndPullRequest`) requires a live GitHub App →
  `MANUAL_VALIDATION_REQUIRED`.

## Checkpoint 13 — Local MCP and Fully Local Mode

- **Status**: `IN_PROGRESS`
- **Verified on 2026-07-23**:
  - Local workspace boundary, local analyzer, and file watcher exist in
    `@axon/repo-intel`.
  - MCP package exists with strict Zod schemas and a limited tool set:
    inspect/inventory/analyze/get architecture/list evidence/explain evidence/
    audit/create scenario/simulate scenario/update proposal/compare snapshots/
    compare clouds/plan migration/synchronize evidence/export.
  - MCP package now has a runnable `axon-mcp --stdio` entrypoint with JSON-RPC
    handlers for `initialize`, `tools/list`, and `tools/call`; it does not open
    a network listener.
  - Hosted app has local-agent create/list/revoke APIs, sync-run metadata, and a
    Local Intelligence workspace component.
  - Local agents can now exchange the one-time pairing token for a durable
    revocable bearer credential; sync accepts that credential without reusing
    browser cookies and enforces the agent workspace scope.
  - Approved local evidence is persisted as first-class synchronized evidence
    with local provenance, redaction status, raw-source retention status, agent
    ID, sync run ID, analysis version, and workspace snapshot ID.
  - Targeted automated gates now pass:
    `pnpm --filter @axon/repo-intel test`,
    `pnpm --filter @axon/mcp-server test`,
    `pnpm --filter @axon/mcp-server typecheck`,
    `pnpm --filter @axon/mcp-server lint`,
    `pnpm --filter @axon/web test -- local-agent local-intelligence`,
    `pnpm --filter @axon/web typecheck`, and
    `pnpm --filter @axon/web lint`.
- **Fixes made in this pass**:
  - Fixed macOS `/var` vs `/private/var` canonical-root handling while
    preserving symlink-escape checks.
  - Added the missing MCP package entrypoint, tests, Node type config, and lint
    config.
  - Fixed Local Intelligence status badge usage to match the shared UI status
    vocabulary.
  - Added the missing `axon-mcp` CLI/bin entrypoint, dependency-free stdio
    transport, protocol smoke tests, and matching Local Intelligence setup
    instructions.
  - Enforced five-minute, single-use local-agent pairing tokens in the service
    and added expiry/replay tests.
  - Added migration `0005_local_agent_credentials`, durable credential hashing,
    `/api/local-agents/[agentId]/auth`, bearer-authenticated sync, and migrated
    PGlite tests proving raw credentials are not persisted.
  - Added migration `0006_local_synchronized_evidence` and wired sync submission
    to persist only included evidence records with provenance/redaction metadata.
  - Fixed strict TypeScript optional-property handling in local-agent routes and
    sync review manifests.
  - Added MCP `axon_create_scenario` and `axon_simulate_scenario` tools, stdio
    tool discovery metadata, CLI help/commands, and automated coverage for
    deterministic in-memory local scenario simulation.
  - Added MCP `axon_compare_snapshots` using canonical
    `ArchitectureSnapshotSchema` validation and AXON semantic document diff,
    with stdio discovery metadata and automated coverage.
  - Added MCP `axon_plan_migration` for deterministic AWS-to-GCP migration
    planning using the existing migration catalog/engine, with explicit
    unsupported-cloud-pair rejection and automated coverage.
  - Added MCP `axon_update_architecture_proposal` for local review-state changes
    on canonical `ArchitectureProposal` objects, including missing-ID reporting.
  - Added MCP `axon_compare_clouds` for deterministic AWS-to-GCP component
    capability comparison using the existing migration catalog; it does not
    query live clouds or prices.
  - Added MCP `axon_synchronize_evidence` to prepare an explicit hosted sync
    request from approved normalized evidence, preserving exclusions, redaction
    metadata, local analysis version, and workspace snapshot ID; it does not
    call hosted AXON or persist evidence by itself.
  - Added explicit MCP CLI `--state-file` persistence for normalized local
    architecture, evidence, findings, and scenarios between CLI invocations.
    State files are written with owner-only permissions and no network listener
    is opened.
- **Known gaps**:
  - MCP server has a local stdio transport, but not a packaged/published install
    flow or manual validation with a fixture repository.
  - Required MCP tools are present for Checkpoint 13 scope; cost estimation is
    now implemented as the first Checkpoint 14 MCP capability.
  - Fully local persistence is partial: the MCP CLI can persist normalized local
    workspace state, but there is not yet a full local database/project store
    matching hosted persistence semantics.
  - Evidence synchronization persists included normalized evidence, but there is
    not yet a full review/edit UI for removing excerpts/paths per evidence
    record before sync.
  - Durable non-cookie local-agent credentials exist, but credential rotation,
    capability enforcement beyond workspace scope, and CLI-side hosted pairing
    UX are not yet complete.
  - File watching reports changed files but does not yet produce the complete
    local proposal/diff/approval workflow.
  - The CLI command surface exists for status/tools/doctor/inspect/inventory/
    analyze/evidence/audit/scenario/simulate/export with explicit state-file
    persistence, but hosted pairing and full local workspace workflows are not
    complete.
  - No manual validation has been performed with a fixture repository.
- **Next implementation focus**: Continue hardening the MCP transport, CLI,
  local persistence, sync review, and manual gates before promoting Checkpoint
  13 beyond `IN_PROGRESS`.

## Checkpoint 14 — Cloud Cost Intelligence

- **Status**: `IN_PROGRESS`
- **Verified on 2026-07-23**:
  - Added `@axon/architecture-cost` with a versioned provider-neutral pricing
    catalog schema, normalized usage-driver schema, deterministic monthly
    estimate engine, per-service line items, low/expected/high ranges, missing
    input reporting, unsupported-service handling, major cost drivers,
    limitations, and scale projections for 1x/2x/5x/10x/50x.
  - Added an offline deterministic AWS test catalog with explicit pricing
    version/effective date/source references. This is not live provider pricing.
    The deterministic fixture catalog now covers core AWS, GCP, and Azure
    compute/database/storage/queue/egress records for provider comparison.
  - Added `axon_estimate_cost` to the MCP server so local architectures can be
    cost-estimated from explicit usage assumptions without cloud credentials or
    billing-account access.
  - Added owner-scoped `cost_usage_assumptions` and `cost_estimate_runs`
    tables, migration `0007_cost_intelligence`, and a `CostService` with
    migrated-DB tests for assumption upsert, estimate history, preview runs,
    and cross-user isolation.
  - Added owner-scoped cost estimate and estimate-history API routes:
    `POST /api/projects/[projectId]/cost/estimate` persists estimate runs with
    catalog/model metadata, and `GET /api/projects/[projectId]/cost/estimates`
    returns project history without leaking foreign projects.
  - Added a first Cost Explorer workspace tab that shows modeled monthly
    low/expected/high range, pricing basis, service breakdown, scale projection,
    missing inputs, and limitations using the shared cost engine. Default usage
    assumptions are labeled as product defaults; it does not claim invoice
    accuracy.
  - Cost Explorer can now save the current modeled estimate through the
    owner-scoped API and display persisted estimate history for the project.
    It also shows a deterministic AWS/GCP/Azure cloud comparison using the
    shared provider comparison engine.
  - Added a shared default usage-driver derivation for workspace cost surfaces
    and wired Scenario Lab to show modeled cost impact for the current traffic
    scenario using scenario-derived non-fixed usage.
  - Wired the AWS-to-GCP migration workspace to show a modeled current-AWS vs
    target-GCP cost comparison with catalog version and invoice disclaimer.
  - Added a bounded canvas cost-driver overlay that marks only the top modeled
    monthly cost drivers and includes catalog/confidence text for assistive
    technology.
  - Targeted automated gates pass:
    `pnpm --filter @axon/architecture-cost test` (9 tests),
    `pnpm --filter @axon/architecture-cost typecheck`,
    `pnpm --filter @axon/architecture-cost lint`,
    `pnpm --filter @axon/mcp-server test`,
    `pnpm --filter @axon/mcp-server typecheck`,
    `pnpm --filter @axon/mcp-server lint`, and
    `pnpm --filter @axon/web test -- cost-service cost/estimate cost/estimates route-matrix cost-workspace workspace-shell`,
    `pnpm --filter @axon/web typecheck`, and
    `pnpm --filter @axon/web lint`.
- **Known gaps**:
  - Cost Explorer UI is still an initial deterministic view; editable
    assumptions, richer historical comparison, and export workflows are not
    complete.
  - Cost persistence stores usage assumptions and estimate runs, but catalog
    records themselves are not yet persisted/refreshable.
  - The initial catalog is an offline deterministic test catalog, not a live
    provider catalog refresh from official pricing APIs/docs.
  - GCP/Azure pricing records are still minimal deterministic fixture records,
    not complete provider catalogs.
  - PR, runtime calibration, and deeper scenario-lab/migration integrations are
    not complete.
  - Manual validation against known provider pricing has not been performed.
- **Next implementation focus**: Continue Checkpoint 14 until editable
  assumptions, catalog refresh/persistence, exports, PR/runtime integrations,
  and manual validation gates are complete.

## Checkpoint 15 — Visual Architecture Studio

- **Status**: `IN_PROGRESS`
- **Verified on 2026-07-23**:
  - Added a metadata-rich architecture icon registry with stable IDs,
    provider/service/category metadata, aliases, search terms, asset-path
    references, source/version/license notes, deprecation metadata,
    light/dark suitability, default size, viewBox metadata, and unknown-service
    fallback behavior.
  - The registry currently uses AXON-authored generic SVG glyphs and explicitly
    does **not** claim official provider-logo licensing or redistribute provider
    asset archives.
  - Canvas nodes now resolve registry records from node name/category/metadata
    and render an accessible icon slot through the shared `ArchitectureNode`
    primitive while preserving text labels.
  - Added a pure deterministic architecture-aware layout helper that layers
    directed dependencies left-to-right, sorts peers stably, avoids mutating the
    document, and preserves existing user positions by default while supporting
    full preview layouts.
  - Added a conservative canvas `Preview Layout` flow with explicit `Apply
    Layout` and `Cancel Layout` controls. Autosave is suppressed while previewing
    so layout changes are not persisted until applied.
  - Added a composable, read-only cost overlay context for the canvas. It
    derives bounded cost-driver badges from the shared cost model without
    writing overlay state into React Flow node data.
  - Added deterministic SVG export for architecture diagrams using computed
    layout, text labels, generic icon metadata, and XML escaping. The canvas
    toolbar now exposes `Export SVG` for the current in-memory canvas state.
  - Added a workspace Icon Registry tab with search, provider/category filters,
    result counts, aliases, source/version metadata, and explicit licensing
    copy. This makes the current provider-neutral asset boundary visible in the
    product rather than hidden in code.
  - Expanded the AXON-authored generic registry to cover a broader common
    service set across AWS, GCP, Azure, Kubernetes, CNCF, generic compute,
    auth, AI, cache, observability, gateway, storage, and queue categories.
  - Added optional persisted `iconId` support to canonical architecture nodes,
    threaded through canvas adapters, the node inspector, React Flow rendering,
    and SVG export. Existing documents still validate without an icon id and
    fall back to heuristic resolution.
  - Added PNG and standalone HTML exports using the same deterministic SVG
    rendering pipeline. HTML exports embed the diagram plus schema/version,
    timestamp, description, and assumptions; PNG exports rasterize client-side
    without introducing a new dependency.
  - Added a first Presentation Mode workspace tab: read-only architecture
    walkthrough steps are generated from the current document overview, groups,
    representative flows, and assumptions, with explicit previous/next and step
    controls. This is in-product presentation only, not public sharing.
  - Added standalone Presentation Mode HTML export. The export embeds the
    deterministic architecture SVG plus the generated walkthrough steps and
    escapes document/step content for safe portable sharing.
  - Added deterministic layout quality and benchmark helpers for synthetic
    10/50/100/500-node architecture documents. The report checks positioned
    node coverage, missing nodes, overlap pairs, left-to-right edge flow,
    backward edges, and layout bounding boxes without depending on timing
    assertions.
  - Targeted automated gates pass:
    `pnpm --filter @axon/ui test -- architecture-node`,
    `pnpm --filter @axon/ui typecheck`,
    `pnpm --filter @axon/ui lint`,
    `pnpm --filter @axon/diagram-schema test -- architecture-document`,
    `pnpm --filter @axon/web test -- adapters export-svg architecture-icon-registry inspectors icon-registry-workspace presentation-workspace presentation workspace-shell layout-benchmark`,
    `pnpm --filter @axon/web typecheck`, and
    `pnpm --filter @axon/web lint`.
- **Known gaps**:
  - Official provider icon ingestion, licensing documentation for real assets,
    editing upgrades, PDF export/share links, richer presentation authoring,
    browser-rendered performance traces, and manual visual QA are not complete.

## Checkpoint 16 — Full Multi-Cloud Workspace

- **Status**: `IN_PROGRESS`
- **Verified on 2026-07-23**:
  - Added a curated deterministic multi-cloud capability catalog in
    `@axon/repo-intel` for AWS/GCP/Azure core compute, relational database,
    object storage, and queue capabilities. Records include provider/service
    identity, category, deployment/scaling/availability/regional behavior,
    consistency/delivery/network/IAM/encryption/backup semantics, operational
    burden, pricing dimensions, aliases, migration considerations, source
    version, and last reviewed date.
  - Added `planMultiCloudMigration` with mapping classifications for strong
    equivalent, partial equivalent, multiple candidate, redesign required,
    unsupported, and custom-user-mapping-ready plans. It exposes catalog
    version, assumptions, confidence, unresolved decisions, and warnings.
  - Tests cover all six AWS/GCP/Azure provider directions, Azure service
    support, partial queue semantics, unsupported services, and cloud-neutral
    warning behavior.
  - Added a first Multi-Cloud workspace tab with source/target provider
    controls, provider cost comparison, mapping table, catalog provenance,
    unresolved decisions, and warnings that no live cloud inventory is queried
    and no migration is automatically recommended.
  - Targeted automated gates pass:
    `pnpm --filter @axon/repo-intel test -- multicloud-planner`,
    `pnpm --filter @axon/repo-intel typecheck`,
    `pnpm --filter @axon/repo-intel lint`,
    `pnpm --filter @axon/web test -- multi-cloud-workspace workspace-shell`,
    `pnpm --filter @axon/web typecheck`, and
    `pnpm --filter @axon/web lint`.
- **Known gaps**:
  - The catalog is still a small curated fixture, not a complete provider
    capability corpus.
  - Side-by-side canvases, synchronized selection, hybrid architecture mode,
    scenario comparison, availability comparison, export, user override
    persistence, and manual validation are not complete.

## Checkpoint 17 — Collaboration, Sharing, and Presentation

- **Status**: `IN_PROGRESS`
- **Verified on 2026-07-23**:
  - Added an explicit server-side collaboration role/permission matrix for
    Owner, Editor, Commenter, and Viewer. Permissions cover architecture
    editing, evidence, repository/cloud/telemetry connections, scenarios, cost,
    migration planning, infrastructure approval, membership, sharing, export,
    and deletion.
  - Added denial assertions so routes/services can enforce permissions
    server-side instead of inferring access from UI visibility.
  - Added share-token utilities that create high-entropy raw tokens, store only
    SHA-256 hashes, and verify with timing-safe comparison.
  - Added `project_share_links` migration `0008_project_share_links` with
    owner/project scope, unique token hashes, collaboration role, optional
    labels/expiry, revocation timestamp, and cascade deletion.
  - Added `ShareLinkService` with migrated-DB tests proving raw tokens are
    returned only at creation, only hashes are stored, expired/revoked links do
    not resolve, owner links cannot be granted, and another owner cannot list or
    revoke a project link.
  - Added owner-scoped API routes for share-link list/create/revoke:
    `GET/POST /api/projects/[projectId]/share-links` and
    `DELETE /api/projects/[projectId]/share-links/[shareLinkId]`. The route
    matrix marks both as enforced owner APIs.
  - Added a first Sharing workspace tab with role selection, optional labels,
    one-time token display, active-link listing, and revoke controls.
  - Added public token-gated read-only share surfaces:
    `GET /api/share/[token]` returns the shared project/document for active
    non-revoked links, and `/share/[token]` renders a read-only architecture
    page using the deterministic SVG export. Invalid, expired, or revoked tokens
    receive a generic not-found response.
  - Added `project_comments` migration `0009_project_comments` with
    owner/project scope, author IDs, optional diagram/node/edge anchors,
    resolution state, and cascade deletion.
  - Added `CommentService` with migrated-DB coverage for creating, listing, and
    resolving comments, body/anchor validation, and cross-owner non-disclosure.
  - Added owner-scoped comments API routes:
    `GET/POST /api/projects/[projectId]/comments` and
    `PATCH /api/projects/[projectId]/comments/[commentId]`.
  - Added a first Comments workspace tab with anchor selection, comment
    creation, thread listing, open-count status, and resolve controls.
  - Added `project_approvals` migration `0010_project_approvals` with
    owner/project scope, requester/decider IDs, subject kind/id, pending/
    approved/rejected status, decision timestamp, and cascade deletion.
  - Added `ApprovalService` with migrated-DB coverage for creating, listing,
    approving, rejecting, duplicate-decision protection, validation, and
    cross-owner non-disclosure.
  - Added owner-scoped approvals API routes:
    `GET/POST /api/projects/[projectId]/approvals` and
    `PATCH /api/projects/[projectId]/approvals/[approvalId]`.
  - Added a first Approvals workspace tab with approval request form, pending
    count, approval log, approve/reject controls, and recorded terminal states.
  - Targeted automated gates pass:
    `pnpm --filter @axon/web test -- approvals-workspace comments-workspace sharing-workspace workspace-shell approvals approval-service comments comment-service share-links api/share app/share collaboration route-matrix`,
    `pnpm --filter @axon/web typecheck`, and
    `pnpm --filter @axon/web lint`.
- **Known gaps**:
  - Organization/membership tables, invitations, threaded replies, reviewer
    assignment, multi-party approval policies, persistent presentation sharing,
    share analytics, realtime updates, and manual two-user validation are not
    complete.

## Checkpoint 18 — Grounded Architecture Copilot

- **Status**: `IN_PROGRESS`
- **Verified on 2026-07-23**:
  - Added a deterministic copilot grounding module that returns the answer
    contract shape: direct answer, product-native citations, assumptions,
    confidence, missing information, limitations, and suggested next action.
  - Component answers cite current architecture components; finding answers cite
    supplied audit finding fingerprints. The module refuses with
    `insufficient` confidence when no grounded AXON context matches.
  - Added an adversarial untrusted-evidence fixture that attempts prompt
    injection; the grounding module ignores the snippet as instructions and
    does not echo it into the direct answer.
  - Targeted automated gates pass:
    `pnpm --filter @axon/web test -- grounding`,
    `pnpm --filter @axon/web typecheck`, and
    `pnpm --filter @axon/web lint`.
- **Known gaps**:
  - No model-provider integration, typed tool runner, conversation persistence,
    UI chat surface, rate limits, provider controls, or full copilot evaluation
    suite exists yet.

## Checkpoint 19 — Benchmarks, Security, and Scale

- **Status**: `IN_PROGRESS`
- **Verified on 2026-07-23**:
  - Added a versioned repository-intelligence benchmark corpus in
    `@axon/repo-intel` with ground-truth components, relationships, and
    expected secret-redaction markers.
  - Initial fixtures cover a small TypeScript API, Terraform AWS web resources,
    and a malicious README prompt-injection/secret fixture.
  - Added deterministic precision/recall scoring helpers for component IDs and
    relationships, returning corpus version and fixture ID with each score.
  - Added visual layout benchmark helpers in the web package with deterministic
    10/50/100/500-node synthetic diagrams and quality scoring for coverage,
    overlaps, edge direction, and bounding boxes.
  - Targeted automated gates pass:
    `pnpm --filter @axon/repo-intel test -- benchmark-corpus`,
    `pnpm --filter @axon/web test -- layout-benchmark`,
    `pnpm --filter @axon/repo-intel typecheck`, and
    `pnpm --filter @axon/repo-intel lint`.
- **Known gaps**:
  - The corpus is still tiny and fixture-grade; large repos, held-out sets,
    browser-rendered visual traces, cost/simulation/copilot benchmark runners,
    security review automation, and measured performance reports are not
    complete.

## Checkpoint 20 — Production Release and Launch

- **Status**: `IN_PROGRESS`
- **Verified on 2026-07-23**:
  - Added a deterministic release-readiness classifier with explicit gate
    statuses (`passing`, `manual-validation-required`, `blocked`) and CP20
    classifications (`READY_FOR_PRIVATE_ALPHA`, `READY_FOR_LIMITED_BETA`,
    `READY_FOR_GENERAL_AVAILABILITY`, `MANUAL_VALIDATION_REQUIRED`, `BLOCKED`).
  - The classifier refuses GA unless production deployment, security,
    backup/restore, billing, support, monitoring, deletion/export, and all five
    product loops pass.
  - The classifier also refuses beta/private-alpha labels when the staged gate
    evidence is insufficient, so incomplete evidence falls back to
    `MANUAL_VALIDATION_REQUIRED`.
  - Manual-validation and blocked gates take precedence over readiness labels,
    with a concrete next action.
  - Targeted automated gates pass:
    `pnpm --filter @axon/web test -- release-readiness`,
    `pnpm --filter @axon/web typecheck`, and
    `pnpm --filter @axon/web lint`.
- **Known gaps**:
  - Release candidate automation, production deployment evidence, staged rollout
    telemetry, operational runbooks, production OAuth/GitHub/billing/cloud
    connector setup, DNS, support process validation, backup/restore validation,
    and final launch report are not complete.
