# AXON Engineering Instructions

AXON is a production startup, not a portfolio project.

## Product

AXON is a living architecture-intelligence platform that helps users:

- Generate architecture diagrams from natural-language ideas
- Import and analyze existing systems
- Detect reliability, security and scalability risks
- Simulate traffic and component failure
- Compare current and recommended architectures
- Connect runtime telemetry
- Work locally through MCP and CLI tooling

## Source of truth

Read and follow:

- `docs/design/DESIGN.md`

The archived Stitch output is reference material only:

- `docs/design/archive/DESIGN.stitch-original.md`

## Engineering principles

1. Preserve strong package boundaries.
2. Use strict TypeScript.
3. Avoid `any` unless explicitly justified.
4. Do not create giant single-file components.
5. Use semantic design tokens instead of hard-coded colors.
6. Support light and dark themes equally.
7. Respect `prefers-reduced-motion`.
8. All interactive controls must be keyboard accessible.
9. Reuse one canonical mock architecture across landing-page demonstrations.
10. Do not add backend, authentication, billing or database functionality unless requested.
11. Do not install large dependencies without explaining why.
12. Run formatting, linting, type checking and tests before completing a task.
13. Do not modify `docs/design/DESIGN.md` without approval.
14. Do not claim mocked functionality is operational.
15. Keep changes small, reviewable and production-oriented.

## Visual restrictions

Do not introduce:

- Cyan-purple AI gradients
- Glassmorphism
- Glowing AI orbs
- Generic SaaS cards
- Excessive rounded corners
- Decorative animation
- Unrelated design systems

## Initial technology

- pnpm
- Turborepo
- Next.js
- React
- TypeScript
- Tailwind CSS
- Vitest
- Playwright

Use SVG for landing-page architecture demonstrations. Do not introduce React Flow until the actual product workspace is built.
