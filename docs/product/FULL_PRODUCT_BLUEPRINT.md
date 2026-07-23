# AXON Full Product Blueprint

AXON is a living architecture-intelligence platform. The diagram is the primary interface, but the product value comes from a structured, validated architecture model with evidence, simulations, cost estimates, drift, and controlled change workflows.

## Product Promise

AXON helps software teams:

- Design new systems from natural-language requirements.
- Reconstruct existing systems from repositories, IaC, cloud inventory, telemetry, and local MCP analysis.
- Maintain a canonical, versioned `ArchitectureDocument`.
- Preserve evidence and provenance for every significant inference.
- Audit reliability, security, scalability, and operability risks.
- Run deterministic traffic, failure, cost, and migration scenarios.
- Compare AWS, GCP, Azure, and cloud-neutral architecture options.
- Generate reviewable code/IaC changes only after explicit approval.
- Collaborate, present, export, and review architectural history.

## Entry Paths

1. **Start From A Prompt**
   A user describes a product. AXON extracts explicit requirements, labels assumptions, asks only material clarifying questions, validates model output, renders a proposal, and applies it only after review.

2. **Connect GitHub**
   GitHub OAuth remains identity-only. Repository access uses a separate GitHub App with selected repositories, deterministic extractors, redacted evidence, review controls, and explicit application.

3. **Analyze Locally With MCP**
   A local MCP server and CLI analyze approved local roots without executing project code. Raw files remain local unless the user explicitly synchronizes normalized redacted evidence.

## Shared Workspace Flow

Input -> evidence and requirements -> proposal -> review -> canonical document -> visual canvas -> audit -> recommendations -> scenario branches -> simulation -> cost -> cloud comparison -> migration plan -> monitoring -> controlled change generation.

No new evidence source may silently rewrite the canonical document. It can create proposals, findings, drifts, or conflicts that the user reviews.

## Implementation Status

The current repository has strong foundations: Next.js app, owner-scoped persistence, validated architecture documents, editable canvas, deterministic audits, recommendations, simulation, snapshots, GitHub App foundations, IaC extractors, local MCP transport, deterministic cost estimation, multi-cloud catalog slices, and release-readiness gates.

The product is not complete. Major remaining work includes full repository-to-proposal loops, live cloud discovery, telemetry-driven calibration, advanced visual editing/export, collaboration UI, grounded copilot UI/provider integration, official/complete pricing and capability catalogs, benchmark suites, manual validations, and production launch evidence.

See [CHECKPOINT_STATUS.md](CHECKPOINT_STATUS.md) for the durable execution ledger.
