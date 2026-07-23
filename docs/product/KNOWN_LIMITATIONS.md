# AXON Known Limitations

This file records limitations that affect product claims. Do not remove an item unless the implementation, tests, and validation evidence exist.

## Current Product Limitations

- No checkpoint is fully `PASSING` because live/manual validation gates have not been completed.
- GitHub repository intelligence is partial; selected repository flow and safe persistence exist, but full reviewable proposal generation is not complete.
- PR impact analysis has secure webhook/job foundations, but semantic changed-evidence analysis remains shallow.
- Cloud discovery persists connections/runs but currently uses mock assets instead of live AWS/GCP/Azure reads.
- Runtime telemetry persists metrics but simulation calibration is not yet driven by ingested metrics.
- Cost estimates use deterministic offline fixture pricing, not live provider pricing catalogs.
- Multi-cloud comparison uses a small curated catalog, not a complete AWS/GCP/Azure corpus.
- Migration planning is deterministic but not a full phased plan with complete validation, rollback, IAM, networking, and observability guidance.
- Visual Studio has a generic icon registry, browser/search UI, explicit icon references, layout preview, overlays, SVG/PNG/HTML export, first presentation mode with standalone walkthrough HTML export, and deterministic 10/50/100/500-node layout quality checks, but lacks official icon ingestion, advanced editing, nested boundaries, PDF export/share links, richer presentation authoring, and browser-rendered performance traces.
- Collaboration has a permission matrix, hashed/revocable persisted share links, a Sharing workspace tab, token-gated read-only viewer pages, first comments and approvals API/UI slices, and portable presentation export; membership, threaded replies, reviewer assignment, multi-party approval policies, realtime updates, share analytics, and manual two-user validation are not complete.
- Copilot has a grounding contract only; there is no full chat UI, model provider, typed tool runner, persistence, or evaluation suite.
- Benchmarks are small fixture suites, not full product-scale benchmark reports.
- Production release evidence, staged rollout telemetry, billing/support/backups, and operational runbooks are incomplete.

## Validation Limitations

The current automated gate is strong for local implementation: tests, typecheck, lint, production build, and client-bundle secret scan pass. Repo-wide `format:check` still reports historical formatting drift outside the scoped implementation surface.
