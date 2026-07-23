# AXON Module Roadmap

The full product plan is implemented module by module. A module is complete only when implementation, tests, documentation, automated validation, and required manual validation are satisfied.

| Module | Capability | Current Status |
| --- | --- | --- |
| 0 | Baseline reconciliation and orchestration | IN_PROGRESS |
| 1 | Visual Architecture Studio | IN_PROGRESS |
| 2 | Prompt Architect 2.0 and templates | IN_PROGRESS |
| 3 | GitHub repository intelligence | IN_PROGRESS |
| 4 | Local MCP and CLI analysis | IN_PROGRESS |
| 5 | Terraform, Kubernetes, Helm, and IaC intelligence | IN_PROGRESS |
| 6 | Evidence graph and reconciliation | IN_PROGRESS |
| 7 | Architecture snapshots, versions, and drift | IN_PROGRESS |
| 8 | Git webhooks and PR impact | IN_PROGRESS |
| 9 | Scenario Lab 2.0 | IN_PROGRESS |
| 10 | Cloud cost intelligence | IN_PROGRESS |
| 11 | AWS/GCP/Azure semantic comparison | IN_PROGRESS |
| 12 | Cross-cloud migration planning | IN_PROGRESS |
| 13 | Read-only cloud discovery | IN_PROGRESS |
| 14 | Runtime telemetry and calibrated simulation | IN_PROGRESS |
| 15 | Controlled code and IaC change generation | IN_PROGRESS |
| 16 | Collaboration, sharing, exports, and presentation | IN_PROGRESS |
| 17 | Grounded conversational architecture copilot | IN_PROGRESS |
| 18 | Scale, benchmarks, security, and release validation | IN_PROGRESS |

## Dependency Order

1. Stabilize Module 0 documentation, validation, and status accounting.
2. Promote Visual Studio foundations without breaking schema boundaries.
3. Complete prompt, GitHub, local MCP, IaC, and reconciliation loops because later drift/PR/cloud/telemetry work depends on trusted evidence.
4. Complete snapshots and PR processing before continuous monitoring claims.
5. Complete cost, multi-cloud, migration, cloud discovery, and telemetry before copilot or release claims rely on them.
6. Complete collaboration, exports, benchmarks, security, and release gates last.

## Promotion Rules

- `AUTOMATED_VALIDATION_PASSING` means local automated gates pass for the implemented scope.
- `MANUAL_VALIDATION_REQUIRED` means implementation is present but requires live account, production, or operator verification.
- `PASSING` requires both automated and manual gates.
- Fixture-backed behavior must stay labeled until replaced or validated against live/provider data.
