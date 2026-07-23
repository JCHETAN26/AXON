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
> **Current gate:** typecheck 0 errors · `pnpm test` green (web 407, repo-intel
> 17, all packages) · lint clean · production build compiles.
>
> **Not yet done / known gaps** (see per-checkpoint notes):
> - Migration `0003` is validated on PGlite but **not yet applied to live
>   Supabase**.
> - **Checkpoint 8** lacks its security core (no webhook, signature
>   verification, delivery dedup, or job system) and produces a shallow,
>   evidence-free analysis → **BLOCKED**.
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

> Note on numbering: this repo also documents a separate "Public Beta Launch"
> checkpoint series (security, account lifecycle, production readiness) in
> `checkpoint-*.md`. The CP1–4 rows above describe foundational product
> capabilities whose automated tests pass; the two numbering schemes should be
> reconciled in a future pass.

---

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
