# AXON Product Principles

## Core Principle

Diagram is the interface. Architecture intelligence is the product.

## Operating Principles

1. **Evidence before confidence**
   Every significant inference needs provenance, confidence, or a labeled assumption. Unsupported claims stay unresolved.

2. **Deterministic calculations stay authoritative**
   Audits, simulations, semantic diffs, cost estimates, and cloud mappings should be computed by typed code. Models may explain or draft, but they do not become the source of truth.

3. **Explicit approval for change**
   AXON never silently changes repositories, infrastructure, cloud resources, snapshots, or canonical architecture state.

4. **Local-first when sensitivity matters**
   Private repositories and uncommitted work can be analyzed through MCP. Raw source stays local unless the user approves normalized redacted evidence synchronization.

5. **Security is product behavior**
   Owner scope, least privilege, redaction, bounded parsing, non-execution, safe logs, and revocation are part of the user experience.

6. **Visual polish serves understanding**
   The canvas should feel like a precise technical blueprint, not a generic dashboard. Visual features must preserve the structured architecture model.

7. **Mocked and fixture-backed features are labeled**
   Deterministic fixtures are useful for development and demos, but AXON must not claim they are live cloud, telemetry, pricing, or production evidence.

8. **The product must remain explainable**
   Users should see inputs, units, source versions, assumptions, limitations, and suggested next actions.

## Design Guardrails

Follow `docs/design/DESIGN.md`. Preserve the Spatial Architecture system: calm, precise, technical, sharp-edged, grid-aware, and restrained. Avoid cyan-purple AI gradients, glassmorphism, glowing orbs, generic SaaS card layouts, and decorative motion without product meaning.
