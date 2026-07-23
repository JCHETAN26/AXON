The complete product

We are building a living architecture intelligence platform. A user can begin by describing a new product, connecting an existing GitHub repository, or running a local MCP agent against private code. The platform converts those inputs into a structured, editable architecture rather than a static image. Every component and connection can carry evidence showing where it came from: a user requirement, source file, Terraform declaration, Kubernetes manifest, cloud resource, runtime metric, or AI inference. The visual canvas becomes the central interface through which users understand services, data flows, cloud resources, trust boundaries, failure paths, costs, deployment regions, infrastructure changes, and architectural history.

Once an architecture exists, the user can audit it, ask what-if questions, create isolated design branches, simulate traffic and failures, compare alternative technologies, estimate current and scaled costs, and translate the design between AWS, GCP, and Azure. They can ask, “What fails at 10× traffic?”, “What changes if Redis disappears?”, “Would Kafka be better than RabbitMQ here?”, “How much would this cost on GCP?”, or “What did the latest commit change?” The answers must come from deterministic calculations, structured cloud capability data, repository evidence, pricing catalogs, and clearly labeled assumptions—not unsupported model claims.

The product also becomes continuous. Git commits, pull requests, infrastructure declarations, read-only cloud discovery, and runtime telemetry create new architecture snapshots. The platform identifies semantic drift: code says one thing, Terraform says another, the cloud account contains something else, and production behavior may disagree with all three. It can review a pull request’s architectural impact, show which failure paths changed, estimate its cost implications, and eventually generate a reviewable Terraform or Kubernetes pull request. It must never silently modify production infrastructure.

To outperform diagram-focused competitors, the product must also be exceptional visually. It needs a large searchable registry of official and provider-neutral icons, architecture-aware automatic layouts, nested cloud and network boundaries, traffic animations, risk and cost overlays, presentation mode, templates, high-quality exports, collaboration, comments, version history, and smooth editing of large diagrams. The differentiation is that all this visual polish sits on top of a real architecture knowledge model. Other tools may draw what a system looks like; this product should explain why the system looks that way, how it may fail, what it costs, how it changed, and how to improve it safely.

Full module sequence
Module	Capability
0	Baseline reconciliation and build orchestration
1	Visual Architecture Studio and icon registry
2	Prompt Architect 2.0 and architecture templates
3	GitHub repository intelligence
4	Local MCP and CLI analysis
5	Terraform, Kubernetes, Helm and IaC intelligence
6	Evidence graph and cross-source reconciliation
7	Architecture snapshots, versions and drift
8	Git webhooks and pull-request impact analysis
9	Scenario Lab 2.0 and advanced simulations
10	Cloud cost intelligence and cost-at-scale
11	AWS/GCP/Azure semantic comparison
12	Cross-cloud migration planning
13	Read-only cloud discovery
14	Runtime telemetry and calibrated simulations
15	Controlled code and IaC change generation
16	Collaboration, sharing, exports and presentation
17	Grounded conversational architecture copilot
18	Scale, benchmarks, security and full release validation
Master Claude Code build prompt


Then tell Claude Code:

Read FULL_PRODUCT_BUILD_PROMPT.md completely and execute it.
You are the lead product architect, staff engineer, security reviewer, and
execution coordinator for this repository.

Your job is to build the complete architecture-intelligence product described
in this document.

This is a master product contract and execution plan.

Do not treat it as an instruction to rewrite the entire repository in one
uncontrolled change.

Instead, inspect the current system, preserve completed work, maintain a
persistent checkpoint ledger, and build the product module by module in
dependency order.

The product will remain local-first during current development unless explicit
deployment instructions are provided.

Do not deploy to Vercel, cloud accounts, production infrastructure, package
registries, or external customers automatically.

Do not create paid resources.

Do not expose or commit secrets.

Do not rename the existing internal AXON_* configuration namespace during this
initiative. Public branding must be centralized separately so the user-facing
name can change safely without destabilizing configuration, migrations, storage
keys, or historical records.

===============================================================================
PART I — CURRENT BASELINE
===============================================================================

First inspect the repository rather than assuming all items below exist.

The system is expected to contain substantial foundations including:

- Next.js product application
- Auth.js GitHub OAuth for user identity
- PostgreSQL/Supabase cloud persistence
- Local PGlite/test support
- Private-access or invitation controls
- Owner-scoped authorization
- Versioned ArchitectureDocument
- Editable architecture canvas
- Prompt-to-architecture generation
- Docker Compose import
- Deterministic architecture audits
- Evidence-backed findings
- Typed recommendations
- Current / Recommended / Diff
- Explicit recommendation application
- Deterministic simulation
- Optimistic concurrency
- Session-expiry recovery
- Project and account exports
- Project and account deletion
- Legal and trust documentation
- GitHub App repository intelligence, when Checkpoint 5 has already passed

Do not mark any capability complete solely because a file or document exists.

Completion requires implementation, tests, and evidence.

Before feature development:

1. Inspect the entire repository.
2. Inspect current branches and working-tree changes.
3. Reconcile migrations with the configured PostgreSQL database.
4. Identify completed and incomplete capabilities.
5. Identify duplicate implementations.
6. Identify stale documentation.
7. Identify security regressions.
8. Identify uncommitted or suspicious work.
9. Run the established baseline test suite.
10. Record actual status.

Create or maintain:

- docs/product/FULL_PRODUCT_BLUEPRINT.md
- docs/product/PRODUCT_PRINCIPLES.md
- docs/product/DOMAIN_MODEL.md
- docs/product/MODULE_ROADMAP.md
- docs/product/CHECKPOINT_STATUS.md
- docs/product/TRUST_AND_PROVENANCE.md
- docs/product/INTEGRATION_SECURITY.md
- docs/product/KNOWN_LIMITATIONS.md
- docs/product/MANUAL_VALIDATION.md
- docs/product/COMPETITOR_PARITY_SCORECARD.md

CHECKPOINT_STATUS.md is the durable execution ledger.

For every module record:

- Status
- Scope
- Dependencies
- Files changed
- Migrations
- Tests
- Automated validation
- Manual validation
- Known limitations
- Blockers
- Date completed
- Next module

Allowed statuses:

- NOT_STARTED
- IN_PROGRESS
- AUTOMATED_VALIDATION_PASSING
- MANUAL_VALIDATION_REQUIRED
- PASSING
- BLOCKED
- DEFERRED

When this prompt is run again, resume from the first incomplete dependency-safe
module.

===============================================================================
PART II — PRODUCT DEFINITION
===============================================================================

Build a living architecture-intelligence platform for software teams.

The product must help users:

- Design new systems
- Understand existing systems
- Reconstruct architecture from repositories
- Analyze infrastructure declarations
- Visualize components and data flows
- Detect architecture risks
- Simulate traffic and failures
- Ask natural-language what-if questions
- Compare alternative designs
- Estimate cloud costs
- Estimate costs at different scales
- Compare AWS, GCP, and Azure
- Plan cloud migrations
- Monitor changes from Git commits
- Analyze pull-request architecture impact
- Detect architecture drift
- Reconcile code, IaC, cloud, and runtime evidence
- Calibrate models with telemetry
- Generate reviewable code and IaC changes
- Run sensitive analysis locally through MCP

Central product principle:

“Diagram is the interface. Architecture intelligence is the product.”

The visual diagram must be exceptional, but it must represent structured,
validated, versioned domain data.

Every significant inference must include evidence, provenance, confidence, or a
clearly labeled assumption.

Every calculation must expose inputs, units, provenance, and limitations.

Every change must require explicit user approval.

The product must never silently:

- Modify a GitHub repository
- Push a commit
- Merge a pull request
- Deploy infrastructure
- Run Terraform apply
- Run kubectl apply
- Change cloud resources
- Run repository source code
- Install repository dependencies
- Read or retain secret values

===============================================================================
PART III — PRIMARY USERS
===============================================================================

Initial users:

- Technical founders
- Founding engineers
- CTOs
- Senior engineers
- Engineering managers
- Consultants and development agencies
- Platform engineers at smaller teams
- Architects evaluating systems before implementation

Later users:

- SRE teams
- DevOps teams
- FinOps teams
- Cloud migration teams
- Enterprise architecture teams
- Security engineering teams
- Engineering organizations reviewing infrastructure pull requests

The initial product must remain useful to a five-person engineering team while
its domain model supports future organization and enterprise workflows.

===============================================================================
PART IV — THREE ENTRY PATHS
===============================================================================

The primary creation experience must present three equal starting paths.

-------------------------------------------------------------------------------
ENTRY A — START FROM A PROMPT
-------------------------------------------------------------------------------

Example:

“Design a multi-tenant document-processing SaaS using Next.js, PostgreSQL,
Redis, a queue, object storage, Stripe, and an AI model.”

Workflow:

1. Parse stated requirements.
2. Separate explicit requirements from inferred assumptions.
3. Detect important missing information.
4. Ask clarifying questions when they materially affect the architecture.
5. Generate an ArchitectureProposal.
6. Strictly validate model output.
7. Allow one bounded repair attempt.
8. Normalize valid output.
9. Show assumptions.
10. Show unresolved questions.
11. Render the proposal.
12. Let the user edit it.
13. Explicitly apply it as an ArchitectureDocument revision.

Potential questions include:

- Expected traffic
- Availability target
- Number of tenants
- Team size
- Data volume
- Latency targets
- Compliance needs
- Preferred cloud
- Budget
- Recovery objectives
- Geographic requirements
- Data residency
- Workload type
- Read/write ratio
- Event volume

Do not force all questions before the first diagram.

The user should receive a fast initial draft and refine it progressively.

-------------------------------------------------------------------------------
ENTRY B — CONNECT GITHUB
-------------------------------------------------------------------------------

GitHub OAuth remains identity-only.

Repository access uses a separate GitHub App.

Workflow:

1. User signs in.
2. User installs GitHub App.
3. User grants selected repositories.
4. Server verifies installation.
5. User chooses a repository.
6. System analyzes supported files.
7. Deterministic extractors create evidence.
8. Evidence is reconciled.
9. An ArchitectureProposal is created.
10. Every component and relationship links to evidence.
11. User accepts, rejects, edits, or marks items unresolved.
12. Current / Proposed / Diff is displayed.
13. Explicit application creates a new ArchitectureDocument revision.
14. The repository remains unchanged.

Do not expand OAuth login scopes to read repositories.

Do not persist short-lived GitHub installation tokens.

-------------------------------------------------------------------------------
ENTRY C — ANALYZE LOCALLY WITH MCP
-------------------------------------------------------------------------------

Provide a local MCP server and CLI.

This path supports:

- Private repositories
- Uncommitted code
- Regulated codebases
- Local Terraform and Kubernetes
- Claude Code
- Cursor
- Other MCP clients
- Fully local workflows
- Hosted synchronization of redacted evidence only

Two privacy modes:

LOCAL EVIDENCE MODE

- Raw files remain local.
- Deterministic extractors run locally.
- Only normalized, redacted evidence is synchronized after explicit approval.

FULLY LOCAL MODE

- Application runs locally.
- Local database is used.
- MCP runs locally.
- Local analyzers run locally.
- Optional local model may be used.
- No source code must leave the machine.

Hosted and local products must share compatible:

- ArchitectureDocument
- ArchitectureProposal
- EvidenceRecord
- ArchitectureSnapshot
- Finding
- Scenario
- CostEstimate
- MigrationPlan schemas

===============================================================================
PART V — COMMON PRODUCT EXPERIENCE
===============================================================================

All entry paths lead to the same workspace.

Flow:

Input
→ evidence and requirements
→ proposal
→ user review
→ canonical ArchitectureDocument
→ visual architecture
→ audit
→ recommendations
→ scenario branches
→ simulation
→ cost estimation
→ cloud comparison
→ migration planning
→ continuous monitoring
→ controlled change generation

The user must be able to:

- Add or remove components
- Rename components
- Change technology
- Change provider
- Add relationships
- Change direction and protocol
- Move components
- Group components
- Create regions and availability zones
- Define networks and trust boundaries
- Add replicas
- Add caching
- Add queues
- Split a service
- Merge services
- Replace managed services
- Create alternative branches
- Restore previous snapshots
- Compare designs without modifying the canonical architecture

===============================================================================
PART VI — DOMAIN MODEL
===============================================================================

Extend current domain types carefully.

Do not discard or broadly rewrite ArchitectureDocument without proving the
migration path.

Core concepts:

WORKSPACE

- ID
- Owner or organization
- Name
- Description
- Current snapshot
- Connections
- Settings
- Created and updated timestamps

ARCHITECTURE DOCUMENT

Canonical editable representation.

COMPONENT

Suggested fields:

- Stable ID
- Display name
- Logical type
- Technology
- Provider
- Provider service
- Deployment model
- Region
- Availability zones
- Replicas
- Capacity profile
- Data classification
- Criticality
- Owner
- Tags
- Provenance
- Confidence
- User annotations
- Visual position
- Visual group
- Icon reference

RELATIONSHIP

Suggested fields:

- Stable ID
- Source
- Target
- Type
- Direction
- Protocol
- Synchronous/asynchronous
- Data classification
- Request/event rate
- Payload size
- Timeout
- Retry policy
- Authentication
- Encryption
- Optionality
- Failure behavior
- Evidence references
- Confidence

EVIDENCE RECORD

- Evidence ID
- Source type
- Source identifier
- Version/commit
- File path/resource
- Optional line range
- Extracted fact
- Confidence
- Timestamp
- Staleness
- Redaction metadata
- Parser/extractor version

ARCHITECTURE PROPOSAL

- Proposal version
- Source references
- Proposed components
- Proposed relationships
- Suggested removals
- Suggested updates
- Evidence
- Confidence
- Conflicts
- Unresolved questions
- User review decisions
- Status

ARCHITECTURE SNAPSHOT

Immutable state containing:

- Snapshot ID
- ArchitectureDocument
- Evidence references
- Repository commits
- IaC versions
- Cloud-discovery time
- Telemetry window
- Creation reason
- Previous snapshot
- Semantic diff
- Timestamp

FINDING

- Rule
- Category
- Severity
- Confidence
- Evidence
- Affected components
- Affected path
- Explanation
- Limitations
- Status
- Snapshot
- First/last observed
- Resolution state

RECOMMENDATION

- Finding
- Applicability
- Typed patch
- Evidence
- Benefits
- Trade-offs
- Cost impact
- Reliability impact
- Security impact
- Confidence
- Validation requirements

SCENARIO BRANCH

- Base snapshot
- User question
- Typed modifications
- Assumptions
- Resulting architecture
- Simulation runs
- Cost estimates
- Findings
- Cloud mappings
- Applied/discarded state

SIMULATION RUN

- Scenario
- Snapshot
- Inputs
- Input provenance
- Derived loads
- Capacity calculations
- Failure propagation
- Bottlenecks
- Cost effects
- Confidence
- Limitations

COST ESTIMATE

- Snapshot
- Provider
- Region
- Currency
- Pricing version
- Assumptions
- Usage drivers
- Service estimates
- Low/expected/high
- Missing inputs
- Confidence
- Effective date

CLOUD MIGRATION PLAN

- Source provider
- Target provider
- Source architecture
- Target architecture
- Mappings
- Semantic differences
- Data migration
- Networking
- IAM
- Observability
- Application changes
- Phases
- Validation
- Rollback considerations
- Cost comparison
- Risks

CHANGE SET

- Source snapshot
- Target snapshot
- Files affected
- Generated patches
- Validation commands
- Risk
- Approval
- PR status

===============================================================================
PART VII — TRUST AND PROVENANCE
===============================================================================

Use explicit provenance categories:

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

Confidence levels:

- Confirmed
- High
- Medium
- Low
- Unresolved

Confidence must derive from evidence strength and consistency.

Examples:

Dependency in package manifest:
- Low or medium

Database client initialized in source:
- High

Database client plus Terraform resource plus runtime spans:
- Confirmed

Absence of evidence is not proof of absence.

When sources disagree, preserve and show the conflict.

Do not silently rewrite the canonical architecture from new evidence.

===============================================================================
PART VIII — MODULE EXECUTION ROADMAP
===============================================================================

Build the following modules in order.

Skip only modules proven complete.

-------------------------------------------------------------------------------
MODULE 0 — BASELINE RECONCILIATION AND ORCHESTRATION
-------------------------------------------------------------------------------

Purpose:

Create a clean, resumable implementation baseline.

Build or verify:

- Working-tree classification
- Migration consistency
- Baseline tests
- Durable checkpoint ledger
- Master product documents
- Feature flags
- Centralized branding configuration
- Stable internal configuration namespace
- Manual-validation ledger
- Dependency graph between modules

Acceptance:

- Code and live development schema agree.
- No known uncommitted security change is lost.
- Baseline build and tests pass.
- First incomplete module is identified.
- Status can be resumed in a future session.

-------------------------------------------------------------------------------
MODULE 1 — VISUAL ARCHITECTURE STUDIO
-------------------------------------------------------------------------------

Purpose:

Match and exceed the visual architecture experience of leading AI diagram
products.

Build:

- Architecture-aware canvas
- Official cloud icon registry
- Provider-neutral icon registry
- Fast icon search
- Icon aliases
- Categories and tags
- Architecture templates
- Smart automatic layout
- Orthogonal edge routing
- Nested regions
- Availability zones
- Networks
- Trust boundaries
- Grouped subsystems
- Collapsible containers
- Focus mode
- Minimap
- Search and filtering
- Keyboard-first editing
- Undo/redo
- Copy/paste
- Multi-select
- Alignment and distribution
- Snap-to-grid
- Dark/light themes
- Presentation mode
- Animated request flows
- Animated event flows
- Failure-path animation
- Risk overlays
- Cost overlays
- Traffic overlays
- Evidence overlays
- Large-diagram rendering
- SVG export
- PNG export
- PDF export
- Interactive HTML/share export

ICON REGISTRY

Support:

- AWS
- GCP
- Azure
- Kubernetes
- CNCF ecosystem
- Databases
- Queues
- Observability
- AI providers
- Common frameworks
- Generic architecture icons
- User-defined icons

Each icon record should include:

- Stable ID
- Provider
- Service
- Category
- Aliases
- Search terms
- Asset path
- Version
- Source
- License/usage note
- Deprecated status
- Replacement icon where applicable

Create a reproducible ingestion pipeline.

Do not scrape arbitrary websites.

Use official asset packages or clearly licensed sources.

When redistribution terms do not allow committing the source package, provide a
local build/fetch script and retain licensing metadata.

Unknown technologies receive provider-neutral icons rather than incorrect
provider guesses.

Performance targets must be benchmarked, not assumed.

Test at:

- 10 nodes
- 50 nodes
- 100 nodes
- 500 nodes

Acceptance:

- Ordinary architecture is attractive without manual styling.
- Large diagrams remain navigable.
- Exports retain visual quality.
- Icon lookup is fast.
- Provider switching updates icon representation without losing logical IDs.
- Reduced-motion mode preserves information.
- Visual regression tests exist.
- Accessibility and 390px responsive behavior pass.

-------------------------------------------------------------------------------
MODULE 2 — PROMPT ARCHITECT 2.0 AND TEMPLATE LIBRARY
-------------------------------------------------------------------------------

Purpose:

Make prompt-driven architecture generation fast, editable, transparent, and
more polished than diagram-only generators.

Build:

- Progressive requirement extraction
- Clarifying-question engine
- Fast draft mode
- Detailed design mode
- ArchitectureProposal schema
- Strict validation
- Bounded repair
- Visible assumptions
- Unresolved-question panel
- Requirements-to-component traceability
- Natural-language edits
- “Add a cache”
- “Make it multi-region”
- “Replace SQS with Kafka”
- “Make this cloud-neutral”
- “Optimize for a small team”
- “Optimize for lowest cost”
- “Optimize for highest availability”
- Architecture-specific templates
- Industry-neutral templates
- SaaS
- AI application
- Data platform
- Event-driven system
- E-commerce
- Mobile backend
- Multi-tenant platform
- Batch processing
- Streaming system
- Serverless system
- Kubernetes platform
- RAG system
- Agentic AI system
- Fintech-style transaction platform

Natural-language edits must compile to typed patches.

The model must not modify the document directly.

Workflow:

Natural language
→ typed intent
→ preview
→ semantic diff
→ explicit apply

Acceptance:

- Generated diagrams validate.
- Explicit requirements are traceable.
- Assumptions remain labeled.
- User can refine without full regeneration.
- Model output cannot bypass validation.
- Typical prompts are benchmarked for generation latency.
- Generation quality is evaluated on a maintained prompt suite.

-------------------------------------------------------------------------------
MODULE 3 — GITHUB REPOSITORY INTELLIGENCE
-------------------------------------------------------------------------------

Purpose:

Create an evidence-backed architecture from selected GitHub repositories.

Build or complete:

- Separate GitHub App
- Least-privileged permissions
- Installation flow
- Signed state
- Repository selection
- Manual sync
- Bounded file inventory
- Deterministic extractors
- Secret redaction
- Evidence storage
- ArchitectureProposal
- Evidence viewer
- Review controls
- Current / Proposed / Diff
- Explicit apply
- Disconnect and deletion
- Account export/deletion support

Initial supported files:

- package.json
- requirements.txt
- pyproject.toml
- go.mod
- pom.xml
- Gradle files
- .csproj
- Gemfile
- Dockerfiles
- Docker Compose
- GitHub Actions
- Common source integration patterns
- Safe environment-variable names

Never execute repository code.

Every proposed relationship requires directional evidence.

Acceptance:

- One test repository produces a reviewable proposal.
- Every accepted item has evidence.
- Another user cannot access repository data.
- Repository remains unchanged.
- Secret-leak adversarial suite passes.

-------------------------------------------------------------------------------
MODULE 4 — LOCAL MCP AND CLI
-------------------------------------------------------------------------------

Purpose:

Provide local-first architecture intelligence.

Build:

- Local MCP server
- CLI wrapper
- Shared analyzer core
- Approved workspace roots
- Path-traversal protection
- Ignore-file handling
- Secret redaction
- Local evidence database
- Local ArchitectureProposal
- Audit tool
- Simulation tool
- Cost tool
- Cloud comparison tool
- Export tool
- Optional hosted evidence synchronization
- Optional local watcher, disabled by default
- Local-provider adapter
- Fully local configuration
- MCP documentation and examples

Conceptual MCP tools:

- scan_workspace
- analyze_repository
- list_evidence
- build_architecture_proposal
- get_architecture
- audit_architecture
- simulate_scenario
- estimate_cost
- compare_clouds
- plan_migration
- compare_snapshots
- explain_finding
- export_architecture

Do not expose arbitrary shell tools.

Do not execute package managers, Docker, Terraform, Helm, or kubectl.

Acceptance:

- A local test repository is analyzed through MCP.
- Raw files remain local.
- The proposal uses shared schemas.
- Audit and simulation work locally.
- Path traversal and secret leakage tests pass.

-------------------------------------------------------------------------------
MODULE 5 — INFRASTRUCTURE-AS-CODE INTELLIGENCE
-------------------------------------------------------------------------------

Purpose:

Understand declared infrastructure without executing it.

Build in this order:

1. Terraform
2. Kubernetes
3. Helm
4. CloudFormation
5. Pulumi where safe static analysis is practical

Terraform support:

- Providers
- Resources
- Modules
- Variables
- Outputs
- Data sources
- References
- Networking
- IAM relationships
- Compute
- Databases
- Queues
- Storage
- Load balancers
- Serverless
- Monitoring

Do not:

- Run Terraform
- Download arbitrary modules automatically
- Execute providers
- Run plan
- Run apply

Kubernetes support:

- Deployments
- StatefulSets
- DaemonSets
- Services
- Ingress
- Gateway API
- Jobs
- CronJobs
- ConfigMaps
- Secret references
- PersistentVolumeClaims
- Autoscalers
- NetworkPolicies
- Namespaces

Never retain secret values.

Acceptance:

- Code plus Terraform/Kubernetes produces one proposal.
- Conflicts are visible.
- No source is silently preferred.
- Unsupported constructs are reported honestly.
- Parsers are deterministic and bounded.

-------------------------------------------------------------------------------
MODULE 6 — EVIDENCE GRAPH AND RECONCILIATION
-------------------------------------------------------------------------------

Purpose:

Merge user, prompt, repository, IaC, cloud, and runtime evidence into one
trustworthy knowledge graph.

Build:

- Stable logical entity matching
- Evidence-strength scoring
- Conflict detection
- Duplicate reconciliation
- Source-priority rules
- User-confirmation overrides
- Staleness
- Disconnection status
- Evidence lineage
- Relationship-specific reconciliation
- Unknown/unresolved state
- Evidence search
- Evidence graph UI

Examples:

- Code references Redis, Terraform declares Redis, runtime has Redis spans:
  confirmed Redis component.

- Architecture says Redis exists, code has no evidence, Terraform still declares
  it, runtime shows no use:
  discrepancy, not automatic removal.

Acceptance:

- Conflicting fixtures remain visible.
- Absence never causes automatic deletion.
- User decisions persist.
- Evidence lineage survives snapshot changes.

-------------------------------------------------------------------------------
MODULE 7 — SNAPSHOTS, VERSIONING, AND DRIFT
-------------------------------------------------------------------------------

Purpose:

Turn architecture into a continuously versioned model.

Build:

- Immutable snapshots
- Snapshot reasons
- Semantic diffs
- Evidence diffs
- Finding history
- Cost history
- Scenario history
- Restore flow
- Manual reconciliation
- Stale proposals
- Drift categories

Detect:

- Component added/removed
- Technology changed
- Provider changed
- Relationship changed
- Public exposure changed
- Region changed
- Capacity changed
- Redundancy changed
- Evidence changed
- Confidence changed
- Finding introduced/resolved
- Cost changed

Drift categories:

- Intended versus repository
- Repository versus IaC
- IaC versus cloud
- Architecture versus runtime
- Previous commit versus current commit
- Approved versus proposed

Acceptance:

- Commit A and commit B create immutable snapshots.
- Semantic diff is accurate.
- Canonical architecture is not rewritten automatically.
- Snapshot restoration uses optimistic concurrency.

-------------------------------------------------------------------------------
MODULE 8 — REAL-TIME GIT AND PULL-REQUEST IMPACT
-------------------------------------------------------------------------------

Purpose:

Continuously understand architectural changes.

Build:

- GitHub webhook receiver
- Signature verification
- Replay protection
- Idempotency
- Deduplication
- Push processing
- Changed-file analysis
- Incremental extraction
- New snapshot creation
- PR temporary snapshots
- PR semantic diff
- Affected audits
- Cost-impact calculation
- Scenario-impact calculation
- In-product notifications
- Optional later GitHub Check Run adapter

Initial permissions remain read-only.

Do not add repository write permissions until controlled change generation.

PR review should answer:

- What architecture changed?
- Which components are affected?
- Which dependencies were introduced?
- Did public exposure change?
- Did resilience decrease?
- Did cost increase?
- Did cloud portability decrease?
- Which findings appeared or resolved?
- What should the reviewer verify?

Acceptance:

- Push event creates one idempotent snapshot.
- PR review links every claim to changed evidence.
- Duplicate webhook delivery causes no duplicate state.
- Invalid signatures fail safely.

-------------------------------------------------------------------------------
MODULE 9 — SCENARIO LAB 2.0
-------------------------------------------------------------------------------

Purpose:

Answer grounded what-if questions without changing the canonical architecture.

Build:

- Scenario branches
- Natural-language scenario parser
- Typed ScenarioDefinition
- Scenario preview
- Explicit run
- Baseline comparison
- Scenario-to-scenario comparison
- Apply or discard
- Traffic propagation
- Failure propagation
- Retry amplification
- Queue modeling
- Region failure
- Latency modeling
- Error propagation
- Autoscaling
- Capacity dimensions
- User-journey impact
- Cost integration

Questions include:

- What happens at 10× traffic?
- What if Redis goes down?
- What if the database primary fails?
- What if one region fails?
- What if Stripe is unavailable?
- What if cache hit rate drops?
- What if workers become five times slower?
- What if payload size doubles?
- What if storage grows by 1 TB monthly?
- What if RabbitMQ is replaced by Kafka?
- What if we split the monolith?
- What if we add a second region?
- What if the API moves to serverless?

AI interprets the question into typed data.

Calculations remain deterministic.

Outputs:

- First projected constraint
- Saturated components
- Backlog
- Failure paths
- Unavailable user journeys
- Latency impact
- Error impact
- Cost impact
- Confidence
- Assumptions
- Missing inputs
- Suggested mitigations

Use:

“Estimated from supplied and observed architecture parameters.”

Never claim production benchmarking without real benchmarking.

Acceptance:

- Same scenario and inputs produce the same result.
- Every input has provenance.
- Scenario remains isolated.
- Failure propagation follows represented relationships.
- Natural-language interpretation is shown before execution.

-------------------------------------------------------------------------------
MODULE 10 — COST INTELLIGENCE
-------------------------------------------------------------------------------

Purpose:

Estimate cloud cost and cost-at-scale without false precision.

Build:

- Versioned pricing catalog
- Provider adapters
- AWS pricing
- GCP pricing
- Azure pricing
- Region support
- Currency
- Effective dates
- Pricing refresh process
- Normalized usage drivers
- Low/expected/high estimates
- Service-level cost
- Category cost
- Scenario cost
- Cost-at-scale
- Cost overlays
- Cost breakpoints
- Missing-input detection
- Confidence
- Cost history

Usage drivers:

- Requests
- Invocations
- vCPU-hours
- Memory-hours
- Instance-hours
- Storage
- IOPS
- Reads/writes
- Queue operations
- Data scanned
- Data transfer
- Egress
- Logs
- Metrics
- Traces
- AI tokens
- Backups
- CDN bandwidth

Scale comparisons:

- Baseline
- 2×
- 5×
- 10×
- 50×

Do not scatter pricing constants through UI code.

Do not claim an estimate equals the customer’s actual bill.

Acceptance:

- Pricing is versioned.
- Fixture estimates are reproducible.
- Every estimate contains an effective date.
- Unknown usage creates a range or missing-input warning.
- Controlled benchmark fixtures measure estimation error.

-------------------------------------------------------------------------------
MODULE 11 — MULTI-CLOUD SEMANTIC COMPARISON
-------------------------------------------------------------------------------

Purpose:

Compare AWS, GCP, and Azure beyond name substitution.

Build a curated capability catalog containing:

- Provider
- Service
- Category
- Deployment model
- Scaling
- Availability
- Delivery semantics
- Storage semantics
- Networking
- IAM
- Regional constraints
- Operational complexity
- Pricing dimensions
- Equivalent services
- Partial equivalents
- Unsupported features
- Migration considerations

Support:

- AWS → GCP
- AWS → Azure
- GCP → AWS
- GCP → Azure
- Azure → AWS
- Azure → GCP
- Cloud-neutral → all providers

Show:

- Source diagram
- Target diagram
- Mappings
- Semantic differences
- Availability differences
- Scaling differences
- IAM differences
- Networking differences
- Security differences
- Cost differences
- Operational differences
- Portability
- Ambiguity

Acceptance:

- Mapping rules are testable.
- Partial equivalence is represented.
- Unsupported capabilities are visible.
- Provider switching preserves logical component identity.
- Target architecture validates.

-------------------------------------------------------------------------------
MODULE 12 — CLOUD MIGRATION PLANNER
-------------------------------------------------------------------------------

Purpose:

Turn a cloud comparison into a phased, reviewable migration plan.

Workflow:

Current architecture
→ target provider
→ candidate mappings
→ ambiguity resolution
→ target ArchitectureDocument
→ audit
→ simulation
→ cost estimate
→ migration phases

Plan includes:

- Source and target
- Service mappings
- Semantic differences
- Data migration
- Networking
- IAM
- Observability
- Application changes
- Phased cutover
- Validation
- Rollback
- Downtime assumptions
- Cost comparison
- Risks
- Unsupported mappings

Suggested phases:

1. Discovery
2. Dependency validation
3. Identity preparation
4. Network foundation
5. Stateless services
6. Queues and events
7. Data synchronization
8. Database cutover
9. Observability
10. Traffic shifting
11. Rollback validation
12. Decommissioning

The product must never call a migration production-ready merely because service
names were mapped.

Acceptance:

- AWS test architecture produces a valid GCP and Azure proposal.
- Ambiguous mappings require review.
- Plan contains validation and rollback considerations.
- Scenario and cost engines operate on target architecture.

-------------------------------------------------------------------------------
MODULE 13 — READ-ONLY CLOUD DISCOVERY
-------------------------------------------------------------------------------

Purpose:

Compare declared architecture with real cloud resources.

Build one provider at a time:

1. AWS
2. GCP
3. Azure

Use least-privileged delegated access.

Never request root credentials.

Never modify resources.

Initial AWS:

- Regions
- VPC
- Subnets
- Security groups
- Load balancers
- ECS
- EKS metadata
- Lambda
- API Gateway
- RDS
- ElastiCache
- DynamoDB
- SQS
- SNS
- EventBridge
- S3
- CloudFront
- CloudWatch references

Initial GCP:

- Projects
- Regions
- VPC
- Subnets
- Firewall rules
- Load balancing
- Cloud Run
- GKE metadata
- Cloud Functions
- API Gateway
- Cloud SQL
- Memorystore
- Firestore
- Pub/Sub
- Cloud Storage
- CDN
- Monitoring references

Initial Azure:

- Subscriptions
- Regions
- Virtual networks
- Subnets
- NSGs
- Load balancers
- App Service
- Container Apps
- AKS metadata
- Functions
- API Management
- Database services
- Redis
- Cosmos DB
- Service Bus
- Storage
- Front Door/CDN
- Monitor references

Cloud discovery creates EvidenceRecords.

Resources in the same account must not automatically be treated as connected.

Acceptance:

- Read-only test account produces bounded inventory.
- No mutation API is used.
- Resources reconcile with IaC and architecture.
- Disconnect removes future access.
- Cross-user isolation passes.

-------------------------------------------------------------------------------
MODULE 14 — RUNTIME TELEMETRY
-------------------------------------------------------------------------------

Purpose:

Calibrate architecture and simulation with measured behavior.

Start with one integration:

- OpenTelemetry or Prometheus

Later:

- Grafana
- CloudWatch
- Google Cloud Monitoring
- Azure Monitor
- Datadog

Prefer aggregate metrics initially.

Useful values:

- Request rate
- Error rate
- p50/p95/p99 latency
- CPU
- Memory
- Database connections
- Query rate
- Queue depth
- Queue age
- Consumer throughput
- Cache hit rate
- Storage growth
- Egress
- Dependency latency
- Retry rate

Require explicit component mapping when ambiguous.

Mark each value as:

- Measured
- Derived
- User-supplied
- Default

Acceptance:

- Measured baseline calibrates a simulation fixture.
- Ambiguous mapping requires confirmation.
- Runtime data does not overwrite architecture silently.
- Retention and disconnect are documented.

-------------------------------------------------------------------------------
MODULE 15 — CONTROLLED CHANGE GENERATION
-------------------------------------------------------------------------------

Purpose:

Convert approved architecture recommendations into reviewable implementation
changes.

Potential outputs:

- Terraform patches
- Kubernetes changes
- Helm changes
- GitHub Actions changes
- Configuration templates
- Architecture decision records
- Migration checklists
- Runbooks
- Application integration changes

Safe workflow:

Finding or migration plan
→ architecture diff
→ proposed file changes
→ validation
→ user review
→ approval
→ GitHub pull request

Never:

- Push to the default branch
- Merge automatically
- Deploy
- Run Terraform apply
- Run kubectl apply
- Modify cloud resources

Generated change includes:

- Files
- Explanation
- Assumptions
- Validation commands
- Risks
- Rollback guidance
- Related finding
- Architecture impact

Acceptance:

- Test recommendation generates a deterministic reviewable patch.
- Repository stays unchanged until approval.
- PR uses a dedicated branch.
- User can cancel before any write.
- Write permissions are requested only when this module is enabled.

-------------------------------------------------------------------------------
MODULE 16 — COLLABORATION, SHARING, EXPORTS, AND PRESENTATION
-------------------------------------------------------------------------------

Purpose:

Reach feature parity with premium visual architecture tools.

Build:

- Workspace membership
- Roles
- Viewer
- Commenter
- Editor
- Owner
- Invite flow
- Comments
- Component-linked comments
- Mentions
- Resolution state
- Presence
- Live cursors where justified
- Edit conflict handling
- Share links
- Private/public link controls
- Expiring links
- Presentation mode
- Slide-like architecture walkthroughs
- Animated flows
- High-resolution SVG
- PNG
- PDF
- Interactive HTML
- Version history
- Template publishing
- Duplicate/fork project
- Read-only embeds

Do not add complex real-time infrastructure before requirements justify it.

Start with PostgreSQL-backed comments and explicit refresh or lightweight
updates.

Acceptance:

- Shared viewer cannot edit.
- Comments remain owner-scoped.
- Exported diagrams preserve layout.
- Share links can be revoked.
- Public links expose no private evidence unless explicitly selected.
- Accessibility and mobile behavior pass.

-------------------------------------------------------------------------------
MODULE 17 — GROUNDED ARCHITECTURE COPILOT
-------------------------------------------------------------------------------

Purpose:

Answer architecture questions conversationally while remaining grounded.

Questions:

- Why does this component exist?
- Which file proves this relationship?
- What changed in the latest commit?
- What fails first at 10×?
- Why is this finding severe?
- What would this cost on GCP?
- What changes if Redis is removed?
- How would this migrate to Azure?
- Which infrastructure is undeclared?
- Which assumptions are defaults?

Answers must cite:

- Components
- Relationships
- Evidence
- Snapshot
- Simulation
- Pricing version
- Cloud mappings
- Assumptions
- Findings

The model creates explanations.

Structured facts and calculations remain authoritative.

Do not answer unsupported architecture questions confidently.

Return:

- Grounded answer
- Evidence references
- Assumptions
- Confidence
- Missing information
- Suggested next action

Acceptance:

- Adversarial questions do not produce unsupported claims.
- Answers link to exact evidence.
- Private workspace data is isolated.
- Prompts and source data are not logged.

-------------------------------------------------------------------------------
MODULE 18 — SCALE, BENCHMARKS, SECURITY, AND RELEASE
-------------------------------------------------------------------------------

Purpose:

Prove the whole product works and outperforms competitors in
architecture-relevant dimensions.

Create benchmark suites for:

VISUAL QUALITY

- 10-node layout
- 50-node layout
- 100-node layout
- 500-node layout
- Edge crossings
- Label collisions
- Container correctness
- Export quality
- Edit responsiveness
- Icon search

REPOSITORY INTELLIGENCE

- Component precision
- Component recall
- Relationship precision
- Relationship recall
- Confidence calibration
- Unsupported-inference rate
- Secret-redaction accuracy
- Analysis duration

IAC INTELLIGENCE

- Resource extraction accuracy
- Reference resolution
- Conflict detection
- Secret handling

SIMULATION

- Determinism
- Unit correctness
- Queue-model fixtures
- Failure propagation
- Scenario isolation

COST

- Fixture estimate error
- Pricing freshness
- Range correctness
- Missing-input behavior

CLOUD COMPARISON

- Mapping correctness
- Partial-equivalence handling
- Unsupported-feature detection

SECURITY

- IDOR
- SSRF
- Path traversal
- Webhook replay
- Signature verification
- Token leakage
- Secret leakage
- Prompt injection
- Repository poisoning
- Oversized payloads
- Unsafe YAML
- Malicious IaC
- Cross-workspace access
- Export leakage
- Log leakage

PERFORMANCE

- Incremental analysis
- Extractor caching
- Large diagrams
- Background jobs
- Connection usage
- Client bundle
- Memory
- Timeouts

ACCESSIBILITY

- Keyboard
- Focus
- Dialogs
- Screen reader
- Reduced motion
- Contrast
- 390px mobile

Full release validation must cover:

- Prompt path
- GitHub path
- MCP path
- Repository analysis
- IaC
- Drift
- Git commits
- PR impact
- Scenario Lab
- Cost
- Multi-cloud
- Migration
- Cloud discovery
- Telemetry
- Controlled PRs
- Collaboration
- Exports
- Copilot
- Data lifecycle
- Security
- Privacy
- Performance
- Documentation

===============================================================================
PART IX — BACKGROUND PROCESSING
===============================================================================

Some modules require asynchronous work.

Prefer the simplest reliable architecture.

Begin with:

- PostgreSQL-backed jobs
- Dedicated worker process
- Idempotent job keys
- Leases
- Retry limits
- Dead-letter status
- Cancellation
- Progress
- Timeouts
- Per-user limits
- Safe logs

Do not introduce Redis, Kafka, or an external queue without measured need.

Jobs must be:

- Owner-scoped
- Idempotent
- Bounded
- Cancellable where practical
- Safe to retry
- Observable
- Sanitized

===============================================================================
PART X — SECURITY AND PRIVACY
===============================================================================

AUTHENTICATION

- GitHub OAuth is identity-only.
- GitHub App handles repository access.
- MCP uses explicit local authorization.
- Cloud connectors use delegated read-only access.
- Short-lived credentials are preferred.

AUTHORIZATION

Every operation verifies:

- Session
- Workspace access
- Connection ownership
- Repository access
- Project access
- Snapshot access
- Scenario access

Never trust a client-provided user ID.

REPOSITORY SAFETY

Never:

- Execute repository code
- Install dependencies
- Run builds
- Run tests from imported repositories
- Run Docker
- Run Terraform
- Run Helm
- Run kubectl
- Follow unsafe symlinks
- Read outside approved roots
- Read secret stores
- Fetch arbitrary external URLs
- Log source code

SECRET HANDLING

Detect and redact:

- API keys
- OAuth tokens
- Private keys
- Database credentials
- Connection strings
- Session secrets
- Cloud credentials
- Webhook secrets
- Certificates
- High-entropy secrets

Store configuration names when useful, not values.

AI PROVIDERS

- Explain what is sent.
- Send bounded redacted evidence.
- Do not send entire repositories by default.
- Keep keys server-only.
- Validate all output.
- Do not treat output as truth.
- Do not log provider bodies.

DATA LIFECYCLE

Support:

- Repository disconnect
- GitHub App disconnect
- MCP disconnect
- Cloud disconnect
- Telemetry disconnect
- Evidence deletion
- Snapshot retention
- Workspace export
- Account export
- Workspace deletion
- Account deletion

===============================================================================
PART XI — COST AND INFRASTRUCTURE CONTROL
===============================================================================

Development must remain cost-conscious.

Do not provision:

- Paid databases
- Paid queues
- Paid logging
- Paid telemetry
- Paid storage
- Cloud discovery resources
- Deployment environments

without explicit approval.

Use:

- Local fixtures
- Mock provider adapters
- Free-tier-compatible designs
- Deterministic catalogs
- Feature flags
- Conservative limits

All expensive external operations require:

- Authentication
- Ownership
- Quotas
- Rate limits
- Concurrency limits
- Timeouts
- Kill switches

===============================================================================
PART XII — QUALITY BAR FOR EVERY MODULE
===============================================================================

For every module:

1. Inspect existing implementation.
2. Identify reusable components.
3. Design domain schemas first.
4. Design security boundaries.
5. Identify migrations.
6. Present implementation plan.
7. Implement the module.
8. Add unit tests.
9. Add integration tests.
10. Add authorization/IDOR tests.
11. Add failure tests.
12. Add adversarial security tests.
13. Add accessibility tests.
14. Add responsive tests.
15. Update exports and deletion.
16. Update privacy and data handling.
17. Run formatting.
18. Run lint.
19. Run strict type checking.
20. Run all tests.
21. Run production build.
22. Run client-bundle secret scan.
23. Run dependency audit.
24. Update checkpoint status.
25. Produce structured report.

Do not:

- Delete tests to pass
- Skip failing tests silently
- Weaken existing security
- Claim live verification without evidence
- Hide incomplete work
- Create unnecessary generic abstractions
- Commit secrets
- Log sensitive data
- Modify production systems
- Run destructive commands without explicit approval

===============================================================================
PART XIII — AUTOMATED EXECUTION PROTOCOL
===============================================================================

This master prompt should drive sequential development.

On execution:

1. Read the entire prompt.
2. Read the repository.
3. Read CHECKPOINT_STATUS.md.
4. Run baseline validation.
5. Detect the first incomplete dependency-safe module.
6. Mark it IN_PROGRESS.
7. Present its gap analysis and implementation plan.
8. Implement only that module.
9. Validate it fully.
10. Update documentation.
11. Record PASSING, MANUAL_VALIDATION_REQUIRED, or BLOCKED.
12. Commit only reviewed non-secret changes when repository policy allows.
13. Continue automatically to the next dependency-safe module only when:
    - Current module is PASSING
    - No external manual action is required
    - No destructive action is required
    - No paid resource is required
    - Context and repository state remain safe
14. Before ending a session, persist exact progress in CHECKPOINT_STATUS.md.
15. On the next invocation, resume from that state.

Stop immediately when:

- External account configuration is required
- OAuth or GitHub App manual installation is required
- Cloud permissions are required
- Telemetry credentials are required
- A migration needs explicit operator approval
- A paid service would be created
- A destructive action is required
- A security boundary fails
- Cross-user data becomes accessible
- Secrets appear in output or bundles
- Repository state is ambiguous
- A module cannot be completed safely

When stopping for manual action, output:

- Exact current module
- Work already completed
- Exact manual steps
- Values or credentials required, by variable name only
- Where the user should configure them
- How to verify the action
- The exact sentence the user should send to resume

Never ask the user to paste secret values into chat.

===============================================================================
PART XIV — REPORT FORMAT
===============================================================================

After every module report:

- Module name
- Status
- Existing functionality reused
- Files changed
- Migrations
- Domain-model changes
- Security design
- User experience
- Tests added
- Test results
- Build result
- Bundle scan result
- Dependency findings
- Manual validation
- Known limitations
- Deferred capabilities
- Next module
- Complete-product percentage

Classify status exactly as:

- MODULE N: PASSING
- MODULE N: MANUAL VALIDATION REQUIRED
- MODULE N: BLOCKED

Completion percentages must be evidence-based estimates, not declarations of
business success.

===============================================================================
PART XV — START NOW
===============================================================================

Perform the following now:

1. Inspect the repository completely.
2. Inspect current working-tree state.
3. Inspect migration state.
4. Run baseline validation.
5. Create or update all master documentation.
6. Map existing capabilities to Modules 0–18.
7. Identify completed modules.
8. Identify the first incomplete dependency-safe module.
9. Produce a concise gap analysis.
10. Implement that module.
11. Validate it.
12. Update CHECKPOINT_STATUS.md.
13. Continue sequentially under the execution protocol.
14. Stop only for a manual gate, a blocker, a destructive action, a paid
    resource, or an unsafe repository state.

The finished product must deliver this complete loop:

Describe, connect, or scan
→ discover architecture
→ show evidence
→ draw an exceptional diagram
→ audit
→ ask what-if questions
→ simulate scale and failures
→ estimate cost
→ compare clouds
→ plan migration
→ monitor commits and runtime
→ generate reviewable controlled changes

Do not reduce the vision to a diagram generator.

Do not sacrifice the visual studio while building intelligence.

Do not sacrifice evidence and trust while building visual polish.

Build both.