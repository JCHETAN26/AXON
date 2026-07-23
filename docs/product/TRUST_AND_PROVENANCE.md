# AXON Trust And Provenance

AXON must be able to answer "why is this shown?" for every important component, relationship, finding, scenario result, cost estimate, and migration mapping.

## Provenance Categories

- User-stated
- User-confirmed
- Prompt-inferred
- Repository-observed
- IaC-declared
- Cloud-discovered
- Runtime-measured
- Derived
- AI-inferred
- Product-default
- Conflicting
- Stale
- Disconnected

## Confidence Levels

- `confirmed`: Multiple strong sources agree or a user explicitly confirms.
- `high`: One strong source supports the fact.
- `medium`: One moderate source supports the fact, or several weak signals align.
- `low`: Weak or indirect evidence.
- `unresolved`: Evidence is missing, conflicting, or ambiguous.

## Evidence Rules

- Every repository-derived proposal item must cite evidence.
- Redacted excerpts are allowed; full files and secret values are not.
- Evidence should preserve source identifier, commit/version, path/resource, line range when available, extractor version, confidence, and timestamp.
- Source disagreement creates a conflict or drift, not an automatic rewrite.
- Absence of evidence is never proof that a component or relationship does not exist.

## AI Boundaries

AI may draft proposals, explanations, summaries, or natural-language interpretations. AI output must be validated and labeled. Structured facts and deterministic calculations remain authoritative.

## Current Gaps

Evidence exists in repository, local sync, findings, snapshots, costs, and copilot slices. A complete cross-source evidence graph, lineage browser, staleness model, and user-confirmation override flow are not complete.
