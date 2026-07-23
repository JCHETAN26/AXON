# AXON Integration Security

AXON integrates with identity, GitHub repositories, local MCP clients, cloud accounts, telemetry systems, and eventually AI providers. Each integration must be least-privileged, owner-scoped, revocable, bounded, and honest about what data is read.

## Identity

GitHub OAuth is used for identity only. It must not be expanded to repository read scopes. Private beta access and owner-scoped authorization remain separate product gates.

## GitHub App

Repository access uses a GitHub App. Installation state is signed, short-lived, and single-use. Installation access tokens are minted server-side per request and not persisted. Webhooks require HMAC-SHA256 signature verification, replay protection, deduplication, sanitized logging, and owner resolution from stored installation data.

## Local MCP

MCP analysis runs only inside approved workspace roots. It must not expose arbitrary shell execution, package managers, Docker, Terraform, Helm, kubectl, or dependency installation. Raw files stay local unless the user explicitly approves normalized redacted evidence sync.

## Cloud Connectors

Cloud discovery must be read-only and delegated. AXON must never ask for root credentials or mutate resources. Discovery results create evidence and proposals; they do not rewrite canonical architecture automatically.

## Telemetry

Telemetry integrations should prefer aggregate metrics. Ambiguous component mapping requires user confirmation. Runtime data calibrates simulations but does not overwrite architecture silently.

## AI Providers

Server-only API keys, bounded redacted inputs, validated outputs, no provider-body logging, and no confident answers from unsupported context. Users must understand what data is sent.

## Data Lifecycle

Every integration needs disconnect behavior and data lifecycle coverage: repository disconnect, GitHub App disconnect, MCP disconnect/revoke, cloud disconnect, telemetry disconnect, evidence deletion, exports, workspace deletion, and account deletion.

## Current Gaps

GitHub webhook security and local MCP boundaries have tested foundations. Live cloud discovery, telemetry connectors, AI provider integration, organization permissions, export leakage checks, and complete disconnect/deletion coverage for newer modules remain incomplete.
