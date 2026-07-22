# Dependency security review

Command: `pnpm audit --prod` (run 2026-07-21).

| Package | Severity | Type | Path | Fix available | Safe tonight | Decision |
| --- | --- | --- | --- | --- | --- |
| `sharp` (libvips CVEs) | high | transitive (Next.js image optimization) | web → next@16.2.10 → sharp | via a Next.js patch bump | No | **Deferred** |
| `postcss` <8.5.10 (CSS stringify XSS) | moderate | transitive, build-time (Tailwind/PostCSS) | web → next@16.2.10 → postcss | via a Next.js patch bump | No | **Deferred** |

## Rationale

Both findings are transitive dependencies of the pinned `next@16.2.10` and can
only be resolved cleanly by bumping Next.js, which is a framework change that
requires its own verification pass. Per the launch guidance we avoid unrelated
dependency churn tonight.

**Exploitability in AXON's usage is low/none:**

- **sharp** powers `next/image` optimization of raster images. AXON uses **no
  `next/image`** and accepts **no image uploads** (verified) — its assets are
  SVG and data URIs. sharp is therefore never invoked on attacker-controlled
  input at runtime.
- **postcss** runs at build time to compile CSS; it does not process
  user-supplied input at runtime.

## Follow-up

- Bump `next` to a patch release that ships patched `sharp`/`postcss`, then
  re-run the full validation gate. Tracked as a post-launch dependency task.

This is **not** a clean audit — the two findings above remain, documented and
justified as deferred.
