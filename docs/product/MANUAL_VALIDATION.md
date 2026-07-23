# AXON Manual Validation

Automated tests are necessary but not sufficient. A module with live integrations or production behavior cannot become `PASSING` until the manual gate is recorded here or in `CHECKPOINT_STATUS.md`.

## Required Manual Gates

| Area | Manual Validation Needed | Status |
| --- | --- | --- |
| GitHub App install | Install app, select fixture repo, verify owner-scoped repository connection | Not performed |
| Repository analysis | Analyze fixture repo and produce evidence-backed proposal | Not performed |
| GitHub webhooks | Configure live webhook, verify signed push/PR delivery, replay safety, idempotent state | Not performed |
| Controlled PRs | Create branch/PR from approved generated changes with write permissions enabled only for this module | Not performed |
| Local MCP | Run `axon-mcp --stdio` against fixture repo from a real MCP client; verify raw files remain local | Not performed |
| Cloud discovery | Connect read-only AWS/GCP/Azure test account and verify no mutation APIs are used | Not performed |
| Telemetry | Connect OpenTelemetry or Prometheus fixture and confirm measured metrics calibrate simulation | Not performed |
| Cost | Compare deterministic estimates against known pricing fixtures and document error/limitations | Not performed |
| Multi-cloud/migration | Review AWS/GCP/Azure target mappings with ambiguous-service cases | Not performed |
| Collaboration | Validate two-user role behavior, comments, share links, revocation, and export visibility | Not performed |
| Copilot | Evaluate grounded answers against fixture evidence and adversarial prompts | Not performed |
| Release | Production deployment, monitoring, backup/restore, support, billing, data lifecycle, and staged rollout | Not performed |

## Manual Validation Rules

- Do not paste secrets into chat.
- Record variable names and configuration locations only.
- Record the exact date, operator, environment, command/action, observed result, and rollback path.
- Failed manual validation keeps the module `IN_PROGRESS` or `BLOCKED`.
- Passing manual validation does not override failing automated gates.
