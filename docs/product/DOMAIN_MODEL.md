# AXON Domain Model

This document maps the full product contract to the current implementation. It is descriptive, not a license to rewrite schemas broadly.

## Canonical Types

- `ArchitectureDocument`
  Implemented in `@axon/diagram-schema`. It is the canonical editable architecture representation used by the app, canvas, audits, simulation, recommendations, cost estimation, snapshots, and migration helpers.
  Nodes now support an optional `iconId` registry reference. When omitted, the UI resolves a provider-neutral or provider-specific icon from node name/category/metadata.

- `ArchitectureProposal`
  Implemented in `@axon/repo-intel`. It represents reviewable proposed components and relationships with evidence references, confidence, conflicts, unresolved questions, review state, and source commit metadata.

- `RepositoryEvidence`
  Implemented in `@axon/repo-intel`. It stores bounded, redacted facts extracted from supported files. Evidence records include file path, optional line range, extractor, evidence type, fact, confidence, and safe excerpt.

- `AuditFinding`
  Implemented in `@axon/architecture-audit`. Findings include rule identity, severity, affected components, evidence, state, and deterministic fingerprints.

- `Scenario`
  Implemented in `@axon/architecture-simulation`. Current scenarios support deterministic traffic/failure simulation foundations. Full scenario branches and natural-language parsing remain incomplete.

- `CostEstimate`
  Implemented in `@axon/architecture-cost`. Estimates include provider, region, currency, pricing catalog version, effective date, line items, low/expected/high totals, missing inputs, confidence, and limitations.

- `MigrationPlan`
  Partially represented through `@axon/repo-intel` AWS-to-GCP and multi-cloud planners. A complete persisted migration-plan domain object is not finished.

## Persistence Concepts

Current PostgreSQL schema includes users, sessions, private beta access, projects, documents, artifacts, GitHub installations/repositories, repository evidence/proposals, snapshots/drifts, PR analysis runs, cloud connections/runs, telemetry sources/metrics, generated infrastructure PRs, webhooks/jobs, local agents/credentials/sync runs/evidence, and cost assumptions/estimate runs.

All product-data tables must remain owner-scoped unless and until organization membership is fully implemented.

## Trust Model

Facts can come from user statements, prompt inference, repository evidence, IaC, cloud discovery, runtime telemetry, deterministic derivation, AI inference, or product defaults. Conflicts are preserved. Absence of evidence never proves absence.

## Known Model Gaps

- Components and relationships do not yet carry every full-scope field, such as regions, AZs, data classification, retry policy, authentication, encryption, criticality, and ownership.
- Evidence graph lineage exists only in slices; there is no complete graph UI or reconciliation service.
- Cost, scenario, cloud, telemetry, and migration histories are partial.
- Collaboration and organization membership are not yet modeled in persistence.
