```text
Read CHECKPOINTS_6_TO_12_BUILD_PROMPT.md completely and execute it according to
the sequential execution protocol.
```

````text
You are the lead product architect, staff engineer, security reviewer, and
execution coordinator for this repository.

Your responsibility is to implement Checkpoints 6 through 12 of the architecture
intelligence platform.

This document is a product and implementation contract.

Do not treat it as permission to implement all seven checkpoints in one
uncontrolled pass.

Instead:

1. Inspect the current repository.
2. Verify the actual status of prior checkpoints.
3. Identify the first incomplete dependency-safe checkpoint.
4. Implement only that checkpoint.
5. Validate it completely.
6. Update the durable checkpoint ledger.
7. Stop at manual integration gates.
8. Resume from the ledger after explicit approval.
9. Continue sequentially only when the current checkpoint is genuinely passing.

The checkpoint sequence is:

- Checkpoint 6 — Terraform and Kubernetes Intelligence
- Checkpoint 7 — Architecture Snapshots and Drift
- Checkpoint 8 — GitHub Pull-Request Architecture Reviews
- Checkpoint 9 — AWS-to-GCP Migration Workspace
- Checkpoint 10 — Read-only Cloud Discovery
- Checkpoint 11 — Runtime Telemetry and Calibrated Simulation
- Checkpoint 12 — Controlled Infrastructure Pull Requests

Do not deploy production infrastructure.

Do not create paid services.

Do not expose or commit secrets.

Do not modify real cloud resources.

Do not run Terraform apply.

Do not run kubectl apply.

Do not merge GitHub pull requests.

Do not push directly to a default branch.

Do not execute imported repository application code.

Do not install dependencies from analyzed user repositories.

Do not weaken the existing authorization, security, privacy, recovery,
optimistic-concurrency, or owner-isolation boundaries.

===============================================================================
SECTION 1 — PRODUCT CONTEXT
===============================================================================

The product is a living architecture intelligence platform.

Users can currently or eventually begin through:

1. A natural-language prompt
2. A connected GitHub repository
3. A local MCP and CLI workflow

These inputs create or update the same canonical architecture model.

The product must help users:

- Draw and edit architecture diagrams
- Understand existing repositories
- Analyze Infrastructure-as-Code
- See evidence for components and relationships
- Audit reliability, scalability, security, and operability
- Create architecture alternatives
- Simulate traffic and failure scenarios
- Compare AWS, GCP, and Azure
- Plan migrations
- Detect architecture drift
- Review architectural impact from Git commits and pull requests
- Compare intended, declared, deployed, and observed architecture
- Calibrate simulations with runtime telemetry
- Generate controlled, reviewable infrastructure changes

Central product principle:

“Diagram is the interface. Architecture intelligence is the product.”

Every important architectural claim must contain:

- Structured evidence
- Provenance
- Confidence
- Staleness state
- Limitations
- Source version or commit where applicable

Every important calculation must contain:

- Input values
- Units
- Input provenance
- Derived values
- Assumptions
- Confidence
- Limitations

Every proposed change must require explicit user approval.

===============================================================================
SECTION 2 — EXPECTED BASELINE
===============================================================================

Do not assume the following are complete merely because this prompt lists them.

Inspect and verify them.

The application is expected to contain some or all of:

- Next.js application
- Auth.js GitHub OAuth for identity
- GitHub App repository connection
- PostgreSQL persistence
- Local testing database support
- Owner-scoped authorization
- Beta or access controls
- Versioned ArchitectureDocument
- Editable architecture canvas
- Prompt-to-architecture generation
- Docker Compose import
- GitHub repository analysis
- RepositoryEvidence
- ArchitectureProposal
- Proposal review
- Current / Proposed / Diff
- Explicit proposal application
- Deterministic architecture audits
- Typed recommendations
- Deterministic simulation
- Project/account export and deletion
- Optimistic concurrency
- Session-expiry recovery
- Secret scanning
- Security and privacy documentation

Before Checkpoint 6:

1. Inspect the entire repository.
2. Inspect the current working tree.
3. Inspect migrations.
4. Inspect database status documentation.
5. Inspect repository-intelligence schemas.
6. Inspect ArchitectureDocument and ArchitectureProposal.
7. Inspect evidence and confidence models.
8. Inspect audit and simulation packages.
9. Run the established baseline suite.
10. Identify any contradiction between code, schema, and documentation.

Maintain or create:

- docs/product/CHECKPOINT_STATUS.md
- docs/product/IAC_INTELLIGENCE.md
- docs/product/SNAPSHOTS_AND_DRIFT.md
- docs/product/GITHUB_PR_REVIEWS.md
- docs/product/AWS_TO_GCP_MIGRATION.md
- docs/product/CLOUD_DISCOVERY.md
- docs/product/RUNTIME_TELEMETRY.md
- docs/product/CONTROLLED_INFRASTRUCTURE_CHANGES.md
- docs/product/TRUST_AND_PROVENANCE.md
- docs/product/INTEGRATION_SECURITY.md
- docs/product/KNOWN_LIMITATIONS.md
- docs/product/MANUAL_VALIDATION.md

CHECKPOINT_STATUS.md must record:

- Checkpoint number
- Status
- Dependencies
- Scope
- Files changed
- Migrations
- Automated tests
- Manual validation
- Known limitations
- Deferred capabilities
- Blockers
- Completion date
- Next checkpoint

Allowed status values:

- NOT_STARTED
- IN_PROGRESS
- AUTOMATED_VALIDATION_PASSING
- MANUAL_VALIDATION_REQUIRED
- PASSING
- BLOCKED
- DEFERRED

===============================================================================
SECTION 3 — SHARED DOMAIN AND TRUST REQUIREMENTS
===============================================================================

All Checkpoints 6–12 must use the same architecture knowledge model.

Preserve and extend existing domain types rather than creating disconnected
parallel models.

Core domain concepts include:

- ArchitectureDocument
- ArchitectureProposal
- ArchitectureSnapshot
- EvidenceRecord
- Finding
- Recommendation
- ScenarioBranch
- SimulationRun
- SourceConnection
- RepositoryConnection
- CloudConnection
- TelemetryConnection
- CloudMigrationPlan
- InfrastructureChangeSet

Every EvidenceRecord should support:

- Stable evidence ID
- Source layer
- Source type
- Source identifier
- Source version or commit
- File path or remote resource identifier
- Optional line or range information
- Extractor/parser identifier
- Extractor/parser version
- Safe normalized fact
- Safe normalized attributes
- Redaction metadata
- Confidence
- Staleness
- Created timestamp
- Last verified timestamp

Supported provenance categories should include:

- user-stated
- user-confirmed
- prompt-inferred
- repository-observed
- terraform-declared
- kubernetes-declared
- cloud-discovered
- runtime-measured
- derived
- AI-inferred
- product-default
- conflicting
- stale
- disconnected

Supported confidence levels:

- confirmed
- high
- medium
- low
- unresolved

Confidence must be derived from evidence strength and consistency.

Do not rely on model-generated confidence wording.

Absence of evidence is not proof of absence.

When sources disagree, preserve and display the conflict.

Do not silently update or remove canonical architecture components because a
new analysis did not observe them.

===============================================================================
CHECKPOINT 6 — TERRAFORM AND KUBERNETES INTELLIGENCE
===============================================================================

Purpose:

Statically understand Terraform and Kubernetes architecture without executing
infrastructure tools or repository code.

The result must be an evidence-backed ArchitectureProposal, not merely an
inventory of resource names.

-------------------------------------------------------------------------------
6.1 — NO-EXECUTION BOUNDARY
-------------------------------------------------------------------------------

Never:

- Run terraform init
- Run terraform validate
- Run terraform plan
- Run terraform apply
- Download Terraform providers
- Download arbitrary Terraform modules
- Evaluate providers
- Contact a Terraform backend
- Read Terraform state by default
- Run kubectl
- Contact a Kubernetes cluster
- Run Helm
- Render arbitrary Helm templates with executable functions
- Execute repository code
- Install repository dependencies
- Read cloud credentials
- Resolve arbitrary remote resources

Exclude or protect:

- .terraform/
- *.tfstate
- *.tfstate.*
- crash.log
- Terraform backend credentials
- Sensitive tfvars values
- Kubeconfig
- Kubernetes Secret.data
- Kubernetes Secret.stringData
- Private keys
- Tokens
- Certificates
- Connection strings
- Cloud credentials

Secret-reference names may be retained when they provide architecture value.

Secret values must never be retained, logged, exported, or sent to an AI
provider.

-------------------------------------------------------------------------------
6.2 — TERRAFORM PARSER
-------------------------------------------------------------------------------

Do not use regular expressions as the primary HCL parser.

Use a syntax-aware HCL parser, concrete syntax tree, or maintained parsing
library that can statically identify:

- terraform blocks
- required providers
- provider blocks
- resource blocks
- data blocks
- module blocks
- variable blocks
- locals
- outputs
- attributes
- nested blocks
- literal values
- collection values
- references
- depends_on
- count
- for_each
- conditional expressions
- unresolved expressions

Parsing must remain static.

Do not evaluate Terraform.

When a value cannot be resolved safely, represent it as an unresolved
expression.

Example:

```hcl
subnet_id = module.network.private_subnet_ids[count.index]
````

Expected representation:

* Attribute name: subnet_id
* Expression type: indexed module reference
* Referenced module: network
* Referenced output: private_subnet_ids
* Resolution status: unresolved
* Raw expression retained only in a bounded safe normalized form

A malformed Terraform file must fail safely with:

* Sanitized failure code
* File path
* Safe parser position where available
* No stack trace
* No source-code dump
* No fallback to broad regex guessing

Small regexes may be used only after syntax parsing for narrow normalized string
classification.

---

## 6.3 — TERRAFORM RESOURCE CATALOG

Create a versioned, data-driven Terraform resource catalog.

Do not scatter provider mappings across large conditional statements.

Each catalog record should include:

* Terraform resource type
* Provider
* Logical architecture category
* Provider service
* Default icon ID
* Supported attributes
* Relationship-producing attributes
* Security-relevant attributes
* Capacity-relevant attributes
* Cost-relevant attributes
* Support level
* Catalog version

Initial AWS coverage should include a bounded selection across:

Networking:

* aws_vpc
* aws_subnet
* aws_route_table
* aws_route
* aws_internet_gateway
* aws_nat_gateway
* aws_security_group
* aws_vpc_endpoint

Load balancing and ingress:

* aws_lb
* aws_alb
* aws_lb_listener
* aws_lb_target_group
* aws_api_gateway_rest_api
* aws_apigatewayv2_api
* aws_cloudfront_distribution

Compute:

* aws_ecs_cluster
* aws_ecs_service
* aws_ecs_task_definition
* aws_lambda_function
* aws_autoscaling_group
* aws_instance
* aws_eks_cluster, metadata only initially

Data:

* aws_db_instance
* aws_rds_cluster
* aws_dynamodb_table
* aws_elasticache_cluster
* aws_elasticache_replication_group
* aws_s3_bucket

Messaging:

* aws_sqs_queue
* aws_sns_topic
* aws_sns_topic_subscription
* aws_cloudwatch_event_bus
* aws_cloudwatch_event_rule
* aws_cloudwatch_event_target
* aws_lambda_event_source_mapping

Supporting evidence:

* IAM roles and policies
* CloudWatch alarms and log groups
* Secrets Manager references by identifier only
* KMS references by identifier only

Initial GCP coverage should include:

Networking:

* google_compute_network
* google_compute_subnetwork
* google_compute_firewall
* google_compute_global_address
* load-balancing resources where statically representable

Compute:

* google_cloud_run_service
* google_cloud_run_v2_service
* google_cloudfunctions_function
* google_cloudfunctions2_function
* google_container_cluster, metadata only initially

Data:

* google_sql_database_instance
* google_redis_instance
* google_firestore_database
* google_storage_bucket

Messaging:

* google_pubsub_topic
* google_pubsub_subscription

Supporting evidence:

* Service accounts
* IAM bindings
* Monitoring resources
* Secret Manager references by identifier only

Unsupported resources must not disappear.

Represent them as:

* Provider-specific generic infrastructure components
* Unsupported-resource evidence
* Unresolved architecture items

---

## 6.4 — TERRAFORM RELATIONSHIPS

Create relationships only from explicit static evidence.

Supported relationship evidence may include:

* Attribute references
* depends_on
* Module input references
* Module output references when statically identifiable
* VPC references
* Subnet references
* Security-group references
* Load-balancer target references
* Listener-to-target-group references
* Lambda event-source mappings
* SNS subscriptions
* EventBridge targets
* Queue/topic relationships
* Database subnet groups
* Function-to-role association
* Service-to-task-definition association
* CloudFront origin references

Do not infer communication because resources:

* Appear in the same file
* Appear in the same module
* Share a provider
* Share tags
* Share a region
* Have similar names

Every relationship must include relationship-specific evidence.

Relationship evidence should identify:

* Source resource
* Target resource
* Producing attribute or block
* File path
* Range
* Resolution confidence

Keep supporting infrastructure relationships distinct from application data-flow
relationships.

Example:

```text
ECS Service → Security Group
```

is a deployment/network attachment.

It is not automatically an application request flow.

---

## 6.5 — KUBERNETES PARSER

Use bounded, safe YAML parsing.

Support:

* Multi-document YAML
* kind: List
* Namespace
* Deployment
* StatefulSet
* DaemonSet
* Service
* Ingress
* Gateway API where practical
* Job
* CronJob
* ConfigMap
* Secret references
* PersistentVolumeClaim
* HorizontalPodAutoscaler
* NetworkPolicy
* ServiceAccount

Handle:

* apiVersion
* kind
* metadata.name
* metadata.namespace
* metadata.labels
* metadata.annotations, using an allowlist for stored values
* Workload selectors
* Pod-template labels
* Containers
* Images, normalized without registry credentials
* Container ports
* Environment-variable names
* ConfigMap references
* Secret references
* Volumes
* PersistentVolumeClaims
* Service ports
* Service selectors
* Ingress/Gateway backends
* Autoscaler targets
* Service-account references

Unknown CRDs must be preserved as generic Kubernetes resources.

Do not falsely classify unknown CRDs.

Record:

* Group
* Version
* Kind
* Name
* Namespace
* Safe metadata
* Unsupported semantics

---

## 6.6 — KUBERNETES RELATIONSHIPS

Extract explicit relationships including:

* Ingress → Service
* Gateway route → Service
* Service → workload via namespace-aware selector matching
* Workload → ConfigMap
* Workload → Secret reference
* Workload → PersistentVolumeClaim
* HorizontalPodAutoscaler → workload
* Workload → ServiceAccount
* NetworkPolicy → selected workloads
* Job/CronJob → ConfigMap or Secret reference
* ExternalName Service → external dependency alias

Service classification must use actual type:

* ClusterIP
* NodePort
* LoadBalancer
* ExternalName

Do not classify every Service as a load balancer.

Do not infer relationships simply because resources share a namespace.

Selector matching must:

* Respect namespace
* Match all required selector labels
* Handle no-match
* Handle multiple-match
* Preserve ambiguity

Do not invent a single target when a selector matches multiple workloads.

---

## 6.7 — LIMITS

Retain existing repository-inventory limits.

Add configurable limits for:

* Terraform files
* Kubernetes files
* Kubernetes documents
* HCL nesting
* YAML nesting
* YAML aliases
* Resources per file
* Total IaC resources
* References per resource
* Relationships
* Unsupported resources
* Safe normalized attribute size
* Parser duration
* Aggregate downloaded bytes
* Evidence count
* Proposal component count
* Proposal relationship count

Failures must be bounded and sanitized.

---

## 6.8 — IAC EVIDENCE

Every IaC-derived component must include:

* Source layer
* Provider where known
* Terraform type or Kubernetes kind
* Logical name
* Namespace where applicable
* File path
* Start and end range where available
* Commit SHA or local snapshot identifier
* Parser/extractor ID
* Parser/extractor version
* Safe normalized attributes
* Unresolved attributes
* Confidence
* Redaction metadata

Every IaC-derived relationship must include independent evidence.

Do not allow endpoint-existence evidence to substitute for relationship
evidence.

---

## 6.9 — CROSS-SOURCE RECONCILIATION

Reconcile evidence conservatively across:

* Source code
* Dependency manifests
* Docker
* CI/CD
* Terraform
* Kubernetes

Possible reconciliation results:

* confirmed-match
* likely-match
* possible-match
* conflicting
* unresolved
* separate-components

Do not merge components solely because they share a generic technology.

Examples:

Application uses PostgreSQL and Terraform declares one clearly linked PostgreSQL
RDS instance:

* likely or confirmed, depending on explicit references

Application uses PostgreSQL and Terraform declares three PostgreSQL instances:

* unresolved match candidates

Application uses PostgreSQL and Terraform declares MySQL:

* conflicting evidence

A Kubernetes workload references DATABASE_URL while Terraform outputs one
database endpoint into the deployment pipeline:

* stronger association

Absence of IaC evidence must not remove an application component.

Absence of application evidence must not remove an IaC resource.

---

## 6.10 — REVIEW UI

The architecture proposal UI must show:

* Source-code components
* Terraform components
* Kubernetes components
* Match candidates
* Conflicts
* Unsupported resources
* Unresolved resources
* Explicit relationships
* Evidence files and ranges
* Current / Proposed / Diff

The user must be able to:

* Confirm a match
* Reject a match
* Keep components separate
* Edit logical category
* Edit provider service
* Correct relationship direction
* Mark unresolved
* View all supporting evidence
* Apply only selected reviewed items

Applying must:

* Require explicit confirmation
* Validate resulting ArchitectureDocument
* Use optimistic concurrency
* Create a new revision
* Preserve evidence and provenance
* Mark affected audits and simulations stale
* Never modify repository files
* Never modify infrastructure

---

## 6.11 — REQUIRED TEST FIXTURES

Terraform AWS fixture:

```text
VPC
→ public/private subnets
→ load balancer
→ ECS service
→ RDS PostgreSQL
→ SQS
→ Lambda consumer
```

Terraform GCP fixture:

```text
VPC
→ Cloud Run
→ Cloud SQL
→ Pub/Sub
→ Cloud Storage
```

Kubernetes fixture:

```text
Ingress
→ Service
→ Deployment
Deployment → ConfigMap
Deployment → Secret reference
Deployment → PVC
HPA → Deployment
```

Mixed repository fixture:

```text
Application source
+ dependency manifest
+ Terraform
+ Kubernetes
```

Test:

* Component extraction
* Explicit relationships
* Source ranges
* Unsupported resources
* Unresolved expressions
* Multi-document YAML
* kind: List
* Namespace-aware selector matching
* Secret-value removal
* Conservative reconciliation
* Visible conflicts
* No invented relationships
* Malformed HCL
* Malformed YAML
* Alias bombs
* Deep nesting
* Limit enforcement
* Timeout
* Log redaction

---

## 6.12 — MANUAL VALIDATION

Use a non-sensitive fixture repository containing:

* Application source
* Terraform
* Kubernetes

Verify:

* Components render
* Relationships render
* Evidence opens
* Match candidates display
* One match can be confirmed
* One match can be rejected
* One classification can be edited
* Current / Proposed / Diff works
* Applying creates a new revision
* Repository remains unchanged

---

## 6.13 — CHECKPOINT 6 COMPLETION

Run:

* IaC parser tests
* Resource-catalog tests
* Relationship tests
* Reconciliation tests
* Redaction tests
* Limit tests
* Authorization tests
* Existing repository-intelligence tests
* All monorepo tests
* Formatting
* Lint
* Strict typecheck
* Production build
* Client-bundle secret scan
* Dependency audit

Classify:

* CHECKPOINT 6: PASSING
* CHECKPOINT 6: MANUAL VALIDATION REQUIRED
* CHECKPOINT 6: BLOCKED

Do not begin Checkpoint 7 unless Checkpoint 6 is passing or only an explicitly
approved manual verification remains.

===============================================================================
CHECKPOINT 7 — ARCHITECTURE SNAPSHOTS AND DRIFT
===============================================

Purpose:

Create immutable architecture history and identify meaningful changes between
intent, code, IaC, cloud, and runtime sources.

---

## 7.1 — SNAPSHOT MODEL

Create or complete ArchitectureSnapshot.

A snapshot should include:

* Snapshot ID
* Workspace/project ID
* ArchitectureDocument revision
* Immutable normalized architecture payload
* Evidence references
* Source-connection references
* Repository commits
* IaC source versions
* Cloud discovery version/time
* Telemetry window
* Creation reason
* Created-by identity or system actor
* Previous snapshot ID
* Snapshot status
* Semantic hash
* Created timestamp

Creation reasons may include:

* user-edit
* prompt-generation
* repository-analysis
* IaC-analysis
* Git-push
* pull-request-analysis
* cloud-discovery
* telemetry-calibration
* recommendation-applied
* scenario-applied
* migration-proposal
* manual-snapshot

Snapshots must be immutable.

Do not mutate an old snapshot when evidence changes.

Do not duplicate full payloads unnecessarily when safe content-addressed storage
or compression already exists, but do not introduce complex storage solely for
premature optimization.

---

## 7.2 — SNAPSHOT CREATION RULES

Create a snapshot when:

* A reviewed architecture proposal is applied
* A user explicitly saves a named version
* A meaningful repository analysis is applied
* An IaC proposal is applied
* A scenario branch is explicitly applied
* A migration target is explicitly accepted
* A later cloud or telemetry reconciliation is accepted
* A monitored commit creates a meaningful architecture change

Do not create snapshots for:

* Every mouse movement
* Pure layout changes, unless the user requests visual-version history
* Failed saves
* Unapplied proposals
* Read-only simulations
* Temporary UI state

Distinguish:

* Architecture-semantic changes
* Visual-layout-only changes
* Metadata changes
* Evidence-only changes

---

## 7.3 — SEMANTIC DIFF ENGINE

Build a deterministic semantic diff.

Detect:

Component changes:

* Added
* Removed
* Renamed
* Logical type changed
* Technology changed
* Provider changed
* Provider service changed
* Deployment model changed
* Region changed
* Availability-zone changed
* Replica count changed
* Capacity changed
* Data classification changed
* Criticality changed
* Ownership changed

Relationship changes:

* Added
* Removed
* Direction changed
* Type changed
* Protocol changed
* Sync/async changed
* Optionality changed
* Retry behavior changed
* Timeout changed
* Authentication changed
* Encryption changed
* Data classification changed

Boundary changes:

* Public exposure
* Network placement
* Trust boundary
* Region
* Availability zone
* Subsystem grouping

Evidence changes:

* Evidence added
* Evidence removed
* Confidence changed
* Evidence stale
* Evidence disconnected
* Conflict introduced
* Conflict resolved

Finding changes:

* Finding introduced
* Finding severity changed
* Finding resolved
* Finding reopened
* Finding evidence changed

Cost and simulation references may be attached later without blocking this
checkpoint.

Do not use display names as the sole entity identity.

Use stable logical IDs and conservative entity matching.

---

## 7.4 — DRIFT MODEL

Support drift categories:

* Intended architecture versus repository
* Repository versus Terraform
* Repository versus Kubernetes
* IaC versus accepted architecture
* Previous commit versus current commit
* Approved snapshot versus new proposal
* IaC versus cloud, when cloud discovery exists
* Architecture versus runtime, when telemetry exists

Drift states:

* detected
* acknowledged
* accepted
* rejected
* resolved
* stale
* superseded

Drift record should include:

* Base snapshot
* Compared source/snapshot
* Drift category
* Semantic changes
* Evidence
* Severity
* Confidence
* Status
* User resolution
* Created and resolved timestamps

Examples:

```text
Approved architecture includes Redis.
Repository no longer contains current Redis evidence.
Terraform still declares Redis.

Result:
Drift detected.
Do not remove Redis automatically.
```

```text
Terraform adds an internet-facing load balancer.
Approved architecture marks the service internal.

Result:
Public-exposure drift.
```

---

## 7.5 — STALENESS

Mark evidence or proposals stale when:

* Repository commit changes
* An installation is disconnected
* Repository permission is removed
* Extractor version changes materially
* IaC source changes
* Cloud connection is disconnected
* Telemetry mapping changes
* A newer analysis supersedes the source

Stale does not mean false.

Display:

* Last verified commit/version
* Last verified time
* Why it became stale
* Recommended refresh action

---

## 7.6 — HISTORY UI

Create a history experience that supports:

* Snapshot timeline
* Snapshot labels
* Creation reasons
* Source commits
* Source connections
* Semantic diff
* Evidence diff
* Finding history
* User annotations
* Restore/fork action
* Reconciliation action

The user should be able to:

* Compare any two snapshots
* View architecture at either snapshot
* View diff overlay
* Filter change categories
* View affected paths
* View evidence
* Fork an older snapshot into a scenario branch
* Restore an older snapshot through a reviewed new revision

Never rewrite history.

Restoring an old snapshot creates a new current revision.

Use optimistic concurrency.

---

## 7.7 — RECONCILIATION

For each drift item, allow:

* Accept source change into architecture
* Keep current architecture
* Merge selectively
* Mark source incomplete
* Mark unresolved
* Acknowledge without changing architecture

Reconciliation must preserve:

* Original snapshot
* Compared source
* User decision
* Resulting revision
* Evidence
* Timestamp

Do not offer an unsafe “accept all drift” operation without category warnings.

---

## 7.8 — RETENTION AND LIFECYCLE

Document and implement:

* Snapshot retention
* Snapshot export
* Project deletion
* Account deletion
* Disconnected source handling
* Evidence deletion
* Applied history behavior

Account export should include supported snapshot metadata and architecture data.

Do not export secrets or raw repository contents.

Project deletion should remove project-scoped snapshots according to documented
behavior.

---

## 7.9 — TESTS

Test:

* Snapshot immutability
* Snapshot creation triggers
* No snapshot on failed save
* No snapshot for pure simulation
* Component diff
* Relationship diff
* Provider change
* Public-exposure change
* Evidence diff
* Confidence change
* Finding history
* Stable-ID matching
* Rename handling
* Ambiguous match
* Drift creation
* Drift acknowledgement
* Drift resolution
* Restore creates new revision
* Optimistic-concurrency conflict
* Cross-user isolation
* Export
* Project deletion
* Account deletion
* Stale evidence
* Disconnected source
* Large diff limits
* Accessibility
* Responsive history UI

---

## 7.10 — MANUAL VALIDATION

Use a test repository:

1. Analyze commit A.
2. Apply architecture proposal.
3. Create snapshot A.
4. Change repository fixture.
5. Analyze commit B.
6. Create proposal B.
7. Compare A and B.
8. Confirm added/removed/changed components.
9. Confirm evidence diff.
10. Reject one drift.
11. Accept one drift.
12. Restore snapshot A as a new revision.
13. Confirm history remains intact.

---

## 7.11 — CHECKPOINT 7 COMPLETION

Run:

* Snapshot tests
* Diff tests
* Drift tests
* Reconciliation tests
* Authorization tests
* Lifecycle tests
* Accessibility tests
* All existing tests
* Formatting
* Lint
* Typecheck
* Production build
* Bundle-secret scan
* Dependency audit

Classify:

* CHECKPOINT 7: PASSING
* CHECKPOINT 7: MANUAL VALIDATION REQUIRED
* CHECKPOINT 7: BLOCKED

Do not begin webhook processing until snapshot immutability and semantic diff are
trustworthy.

===============================================================================
CHECKPOINT 8 — GITHUB PULL-REQUEST ARCHITECTURE REVIEWS
=======================================================

Purpose:

Analyze Git pushes and pull requests, create temporary architecture snapshots,
and explain architectural impact using changed evidence.

---

## 8.1 — GITHUB APP PERMISSIONS

Preserve separation:

GitHub OAuth:

* Identity only

GitHub App:

* Repository access and events

Minimum repository permissions for automated PR analysis:

* Metadata: read-only
* Contents: read-only
* Pull requests: read-only

Webhook events:

* push
* pull_request
* installation
* installation_repositories

Do not request write permissions merely to analyze pull requests.

An optional GitHub Check Run integration requires Checks: write.

Do not enable that permission silently.

Implement the Check Run adapter behind a disabled feature flag and a manual
permission-upgrade gate.

The first passing implementation may display reviews inside the product UI.

---

## 8.2 — WEBHOOK SECURITY

Webhook endpoint must enforce:

* Signature verification
* Current webhook secret
* Supported algorithm
* Body-size limit
* Content-type validation
* Delivery-ID deduplication
* Replay protection
* Timestamp/replay-window strategy where appropriate
* Event allowlist
* Installation verification
* Repository verification
* Ownership verification
* Sanitized logging
* Idempotent processing

Never log:

* Webhook secret
* Raw repository contents
* Installation tokens
* Full webhook payload
* Private URLs with credentials
* Source-code patches

Persist safe event metadata:

* GitHub delivery ID
* Event type
* Installation ID
* Repository ID
* Pull request number
* Before/after commit
* Received timestamp
* Processing status
* Safe failure code

---

## 8.3 — BACKGROUND JOBS

Webhook request handling should:

1. Verify request.
2. Persist safe event metadata.
3. Enqueue an idempotent job.
4. Return quickly.

Use the established job architecture.

Prefer PostgreSQL-backed jobs unless another queue already exists and is
justified.

Jobs must support:

* Idempotency
* Lease
* Retry limit
* Timeout
* Cancellation where practical
* Dead-letter state
* Progress
* Safe failure code
* Owner scope

Duplicate GitHub deliveries must not create duplicate snapshots or reviews.

---

## 8.4 — PUSH ANALYSIS

On push to a monitored default branch:

1. Verify installation and repository.
2. Resolve before/after commits.
3. Fetch bounded changed-file metadata.
4. Ignore unsupported or irrelevant changes.
5. Analyze changed supported files.
6. Reuse cached extraction for unchanged files.
7. Build new evidence state.
8. Create a proposed architecture snapshot.
9. Compute semantic diff.
10. Rerun affected audit rules only where safe.
11. Persist an architecture-change event.
12. Notify the user inside the product.

Do not automatically modify the canonical architecture.

The new commit creates:

* An observed repository snapshot
* Drift against the approved architecture
* A reviewable proposal

The user chooses whether to reconcile it.

---

## 8.5 — PULL-REQUEST ANALYSIS

For a pull request:

1. Resolve base commit.
2. Resolve head commit.
3. Verify both belong to the connected repository.
4. Analyze supported changed files.
5. Build temporary base and head architecture states.
6. Calculate semantic architecture diff.
7. Identify affected components and user journeys.
8. Rerun relevant audit rules.
9. Identify introduced/resolved findings.
10. Estimate simulation impact using existing assumptions where possible.
11. Produce a grounded PR architecture review.

Do not treat the PR as deployed truth.

Review should answer:

* What architecture changed?
* Which components changed?
* Which relationships changed?
* Was a public boundary introduced?
* Did sync/async behavior change?
* Did redundancy change?
* Did a new external dependency appear?
* Did a database or queue dependency change?
* Which existing findings worsened?
* Which findings resolved?
* Which assumptions became stale?
* What should a human reviewer verify?

Every claim must reference changed evidence.

Example:

```text
Change:
Checkout API now makes a synchronous request to Notification Service.

Evidence:
src/checkout/notify.ts, lines 48–71

Potential impact:
- Checkout latency inherits notification latency.
- Notification failure may delay checkout.
- Retry behavior may increase downstream load.

Confidence:
High
```

---

## 8.6 — REVIEW UI

Add a PR review experience showing:

* Repository
* PR number
* Base and head commits
* Analysis status
* Changed files examined
* Files skipped
* Architecture diff
* Finding diff
* Evidence
* Affected paths
* Review summary
* Confidence
* Limitations
* Stale state
* Link to GitHub PR

Allow user actions:

* Acknowledge
* Mark false positive
* Accept architecture changes
* Keep current architecture
* Open scenario from PR changes
* Reanalyze
* View snapshot

Do not allow the browser to select arbitrary repository or PR ownership.

---

## 8.7 — OPTIONAL GITHUB CHECK RUN

Build an adapter but keep it disabled unless:

* The user explicitly enables GitHub output
* The GitHub App has Checks: write
* Manual permission upgrade has been completed
* Feature flag is enabled

Check output must be concise.

Do not post source code.

Do not post private architecture details beyond what the repository’s authorized
reviewers can already access.

Do not post repeated comments on every synchronization.

Prefer one updateable Check Run.

---

## 8.8 — INCREMENTAL ANALYSIS

Cache extractor output by:

* Repository ID
* Commit SHA
* File path
* File blob SHA
* Extractor version

Do not reanalyze unchanged files unnecessarily.

When extractor version changes:

* Mark relevant cache entries stale
* Allow bounded reanalysis
* Record parser version

---

## 8.9 — TESTS

Test:

* Valid signature
* Invalid signature
* Missing signature
* Oversized body
* Unsupported event
* Duplicate delivery
* Replayed delivery
* Wrong installation
* Wrong repository
* Removed permission
* Push idempotency
* PR opened
* PR synchronized
* PR reopened
* PR closed
* Base/head resolution
* Changed-file limits
* Incremental cache
* No duplicate snapshot
* Semantic diff
* Finding introduced/resolved
* Evidence links
* Cross-user isolation
* Source-code log redaction
* Installation-token redaction
* Disabled Check Run adapter
* Permission-gated Check Run
* Accessibility
* Responsive UI

---

## 8.10 — MANUAL VALIDATION

Use a non-sensitive test repository:

1. Install GitHub App.
2. Enable required webhook events.
3. Push an architecture-relevant commit.
4. Confirm one webhook job.
5. Confirm one observed snapshot.
6. Confirm drift appears.
7. Open a pull request.
8. Confirm base/head analysis.
9. Confirm architecture diff.
10. Confirm evidence links.
11. Synchronize the PR again.
12. Confirm existing review updates rather than duplicates.
13. Deliver duplicate webhook manually.
14. Confirm idempotency.
15. Revoke repository access.
16. Confirm further analysis stops safely.

---

## 8.11 — CHECKPOINT 8 COMPLETION

Run:

* Webhook-security tests
* Job tests
* Incremental-analysis tests
* PR-review tests
* Snapshot/drift regressions
* Authorization tests
* All existing tests
* Formatting
* Lint
* Typecheck
* Production build
* Bundle-secret scan
* Dependency audit

Classify:

* CHECKPOINT 8: PASSING
* CHECKPOINT 8: MANUAL VALIDATION REQUIRED
* CHECKPOINT 8: BLOCKED

A live GitHub App webhook configuration is a manual validation gate.

===============================================================================
CHECKPOINT 9 — AWS-TO-GCP MIGRATION WORKSPACE
=============================================

Purpose:

Transform a reviewed AWS architecture into a reviewable GCP architecture while
explaining semantic differences, risks, assumptions, and migration phases.

This checkpoint is model-to-model planning.

It must not modify cloud resources or infrastructure repositories.

---

## 9.1 — MIGRATION BOUNDARY

Do not:

* Connect or mutate AWS
* Connect or mutate GCP
* Generate and apply Terraform
* Create cloud resources
* Claim automatic equivalence
* Claim exact cost without a pricing engine
* Claim zero downtime
* Claim production readiness

The output is:

* Candidate GCP ArchitectureDocument
* Service mappings
* Semantic differences
* Unresolved decisions
* Migration risks
* Migration phases
* Validation plan
* Rollback considerations
* Optional cost interface output

---

## 9.2 — CLOUD CAPABILITY CATALOG

Create a versioned, curated cloud capability catalog.

Do not depend solely on an AI model for provider semantics.

Each service record should include:

* Provider
* Service ID
* Display name
* Category
* Deployment model
* Scaling model
* Availability model
* Regional behavior
* Data durability
* Delivery semantics
* Ordering semantics
* Retry semantics
* Networking model
* IAM model
* Encryption capabilities
* Operational burden
* Pricing dimensions
* Equivalent candidates
* Partial equivalents
* Unsupported features
* Migration considerations
* Source/version metadata
* Last reviewed date

Initial AWS-to-GCP mappings may include:

Compute:

* EC2 → Compute Engine
* ECS/Fargate → Cloud Run or GKE
* EKS → GKE
* Lambda → Cloud Run functions, Cloud Functions, or Cloud Run

Networking:

* VPC → VPC
* ALB/NLB → Cloud Load Balancing
* API Gateway → API Gateway or Apigee where appropriate
* CloudFront → Cloud CDN

Data:

* RDS PostgreSQL → Cloud SQL PostgreSQL or AlloyDB
* Aurora PostgreSQL → AlloyDB or Cloud SQL depending on requirements
* DynamoDB → Firestore, Bigtable, Spanner, or another design depending on access
  patterns
* ElastiCache Redis → Memorystore
* S3 → Cloud Storage

Messaging:

* SQS → Pub/Sub or Cloud Tasks depending on semantics
* SNS → Pub/Sub
* EventBridge → Eventarc, Pub/Sub, or Cloud Scheduler combinations
* Kinesis → Pub/Sub, Dataflow, or Managed Service for Apache Kafka depending on
  workload

Observability and security:

* CloudWatch → Cloud Monitoring and Cloud Logging
* Secrets Manager → Secret Manager
* KMS → Cloud KMS
* IAM roles → Service accounts and IAM policies

Do not assume each source service has one universal target.

Mappings may be:

* exact-enough
* partial
* multiple-candidate
* architecture-redesign-required
* unsupported

---

## 9.3 — MIGRATION INPUTS

Migration workspace should collect or infer:

* Source snapshot
* Source AWS services
* Regions
* Availability target
* Traffic
* Data volume
* Data growth
* Latency target
* RTO
* RPO
* Compliance/data-residency requirements
* Budget
* Team operational preferences
* Existing Terraform/Kubernetes evidence
* Portability constraints
* Downtime tolerance

Missing values must remain visible.

Do not block the first proposal on every missing value.

Use clearly labeled defaults only where necessary.

---

## 9.4 — TARGET ARCHITECTURE GENERATION

Workflow:

1. Select source snapshot.
2. Select GCP target.
3. Identify AWS-specific components.
4. Generate deterministic candidate mappings from catalog.
5. Identify ambiguous mappings.
6. Ask targeted questions where material.
7. Build ArchitectureProposal for GCP.
8. Validate proposal.
9. Show Current AWS / Proposed GCP / Diff.
10. Let user edit mapping.
11. Create isolated migration scenario.
12. Run audit and simulation on target model.
13. Explicitly accept target architecture.

AI may:

* Explain catalog differences
* Interpret requirements
* Organize migration phases
* Suggest options from supplied candidates

AI must not:

* Invent unsupported provider features
* Bypass schema validation
* Remove unresolved mappings
* Treat a partial equivalent as exact

Every target component must reference:

* Source component
* Mapping record
* User decision or assumption
* Confidence

---

## 9.5 — SEMANTIC DIFFERENCES

For each mapping, explain relevant differences:

* Delivery guarantees
* Ordering
* Retry behavior
* Dead-letter behavior
* Scaling
* Cold starts
* Concurrency
* Connection limits
* Regional availability
* Multi-region behavior
* IAM
* Networking
* Private connectivity
* Backup
* Restore
* Replication
* Data consistency
* Maintenance
* Observability
* Quotas
* Operational burden
* Vendor coupling

Example:

```text
AWS SQS → Google Pub/Sub

Classification:
Partial equivalent

Important differences:
- Consumer and acknowledgment model differ.
- Ordering requires explicit ordering keys and constraints.
- Retry/dead-letter configuration differs.
- Existing worker code may require adaptation.

Confidence:
High
```

---

## 9.6 — MIGRATION PHASES

Generate a phased plan.

Suggested phase model:

1. Discovery and evidence validation
2. Target-project and IAM foundation
3. Network foundation
4. Observability foundation
5. Stateless service preparation
6. Messaging/event migration
7. Storage synchronization
8. Database migration
9. Shadow traffic or dual run
10. Validation
11. Traffic shifting
12. Rollback window
13. Source decommissioning

Each phase should include:

* Goal
* Source components
* Target components
* Dependencies
* Required application changes
* Data operations
* Validation
* Failure criteria
* Rollback considerations
* Downtime assumptions
* Owner
* Unresolved questions

---

## 9.7 — AUDIT AND SIMULATION

Run existing deterministic audits on the proposed GCP model.

Run existing scenarios where inputs are available:

* Baseline
* 10× traffic
* Cache degradation
* Worker slowdown
* External dependency outage
* Region outage where supported

Compare AWS and GCP models:

* First projected constraint
* Availability assumptions
* Failure paths
* Operational burden
* Unresolved capacity
* Architecture findings

Do not claim simulation is a production benchmark.

---

## 9.8 — COST INTERFACE

This checkpoint must not invent cloud pricing.

Define or consume a CostEstimateProvider interface.

When a validated cost engine exists, show:

* AWS estimated range
* GCP estimated range
* Pricing effective date
* Usage assumptions
* Major cost drivers
* Missing inputs

When no cost engine exists, show:

```text
Cost comparison unavailable until pricing-catalog validation is configured.
```

Do not use unsourced model-generated dollar amounts.

---

## 9.9 — MIGRATION WORKSPACE UI

Show:

* Source AWS diagram
* Proposed GCP diagram
* Mapping table
* Semantic differences
* Unresolved decisions
* Current / Target / Diff
* Audit comparison
* Simulation comparison
* Cost section
* Migration phases
* Risks
* Validation plan
* Rollback considerations

User actions:

* Choose alternative target
* Keep current service
* Mark custom replacement
* Edit target service
* Mark unresolved
* Add requirement
* Recalculate proposal
* Export migration plan
* Accept target as scenario
* Apply target only through explicit new architecture revision

---

## 9.10 — TESTS

Create migration fixtures:

* ECS + RDS + SQS + S3
* Lambda + API Gateway + DynamoDB
* EKS + RDS + ElastiCache
* EventBridge + Lambda + SQS
* Multi-region AWS architecture

Test:

* Catalog validation
* Exact mapping
* Partial mapping
* Multiple candidates
* Unsupported mapping
* Ambiguous mapping
* User override
* Target validation
* Provenance
* Semantic difference generation
* No invented service
* Migration phase dependency
* Audit on target
* Simulation on target
* Cost unavailable state
* Optimistic concurrency
* Cross-user isolation
* Export
* Accessibility
* Responsive UI

---

## 9.11 — MANUAL VALIDATION

Use a non-sensitive AWS fixture architecture:

1. Open migration workspace.
2. Select GCP.
3. Review mapping candidates.
4. Resolve one ambiguous mapping.
5. Reject one candidate.
6. Choose an alternative target.
7. Review semantic differences.
8. Run target audit.
9. Run target simulation.
10. Review migration phases.
11. Export plan.
12. Confirm no repository or cloud account changed.

---

## 9.12 — CHECKPOINT 9 COMPLETION

Run:

* Capability-catalog tests
* Mapping tests
* Migration-plan tests
* Target-architecture tests
* Audit/simulation integration tests
* Authorization tests
* Export tests
* All existing tests
* Formatting
* Lint
* Typecheck
* Production build
* Bundle-secret scan
* Dependency audit

Classify:

* CHECKPOINT 9: PASSING
* CHECKPOINT 9: MANUAL VALIDATION REQUIRED
* CHECKPOINT 9: BLOCKED

===============================================================================
CHECKPOINT 10 — READ-ONLY CLOUD DISCOVERY
=========================================

Purpose:

Connect cloud accounts with least-privileged read-only access, discover
supported resources, and reconcile them with architecture, repository, and IaC
evidence.

Execute this checkpoint as provider sub-checkpoints:

* 10A — AWS
* 10B — GCP
* 10C — Azure

Complete AWS first.

Do not automatically proceed to another provider when manual credentials or
permissions are required.

---

## 10.1 — CONNECTION SECURITY

Never request:

* AWS root credentials
* Long-lived personal access keys when delegated roles are available
* GCP owner credentials
* Azure global administrator credentials
* Write permissions
* Resource mutation
* Billing mutation
* IAM mutation

Prefer:

AWS:

* Cross-account IAM role
* External ID
* Read-only policy
* Short-lived STS credentials

GCP:

* Workload Identity Federation or approved service-account impersonation
* Read-only roles
* Short-lived credentials

Azure:

* App registration/service principal
* Reader role
* Short-lived credential strategy where available

Store only required connection metadata.

Do not persist short-lived session credentials.

Encrypt long-lived connector secrets when unavoidable.

Do not return connector credentials to the client.

---

## 10.2 — PROVIDER ADAPTER CONTRACT

Create a provider-neutral CloudDiscoveryAdapter interface.

Conceptual operations:

* validateConnection
* listScopes
* discoverResources
* getResourceDetails
* getRelationships
* getDiscoveryStatus
* disconnect
* sanitizeError

All adapters should produce:

* CloudResourceRecord
* CloudRelationshipRecord
* EvidenceRecord
* DiscoveryRun

CloudResourceRecord should include:

* Provider
* Account/project/subscription identifier
* Region
* Provider resource ID
* Resource type
* Logical architecture category
* Provider service
* Name
* Safe tags/labels
* Availability metadata
* Network metadata
* Capacity metadata where safely available
* Created/updated information where available
* Discovery timestamp

Do not store sensitive configuration fields by default.

---

## 10.3 — AWS INITIAL DISCOVERY

Discover a bounded set:

Account and geography:

* Account ID
* Enabled/configured regions, bounded by user selection

Networking:

* VPCs
* Subnets
* Route tables
* Internet gateways
* NAT gateways
* Security groups
* VPC endpoints

Ingress and delivery:

* ALB/NLB
* API Gateway
* CloudFront

Compute:

* ECS clusters/services
* Lambda
* EC2, summarized
* EKS cluster metadata only initially

Data:

* RDS
* Aurora
* DynamoDB
* ElastiCache
* S3, safe metadata only

Messaging:

* SQS
* SNS
* EventBridge

Observability:

* CloudWatch alarms
* Log groups as supporting evidence
* Do not ingest log contents

Security/supporting:

* IAM role associations where necessary
* KMS references
* Secrets Manager references by metadata only
* Never retrieve secret values

Bound:

* Regions
* Resource count
* API calls
* Pagination
* Duration
* Retry
* Concurrent provider calls

---

## 10.4 — CLOUD RELATIONSHIPS

Infer relationships only from explicit cloud configuration such as:

* Load balancer target groups
* Lambda event sources
* SNS subscriptions
* EventBridge targets
* ECS service/task configuration
* VPC/subnet membership
* Security-group attachments
* RDS subnet/security associations
* CloudFront origins
* API Gateway integrations where safely retrievable
* SQS dead-letter policy
* DynamoDB stream-to-Lambda mapping

Do not infer application communication because resources exist in the same
account, VPC, subnet, region, or tag group.

Distinguish:

* Network attachment
* Deployment attachment
* Security attachment
* Event trigger
* Data flow
* Operational monitoring

---

## 10.5 — RECONCILIATION

Compare:

* Approved ArchitectureDocument
* Repository evidence
* Terraform
* Kubernetes
* Cloud resources

Examples:

* Terraform declares two ECS services; cloud discovery finds three.
* Architecture marks a service internal; cloud load balancer is internet-facing.
* Terraform declares RDS; cloud instance is absent.
* Cloud contains a resource not represented in IaC.
* Repository references Redis; no Redis cloud resource is discovered.
* Cloud resource is discovered but has no repository association.

Do not automatically rewrite the canonical architecture.

Create cloud drift records and match candidates.

---

## 10.6 — DISCOVERY UI

Show:

* Connection status
* Account/project/subscription
* Selected regions
* Last discovery
* Resource summary
* Resource diagram overlay
* Match candidates
* Drift
* Unsupported resources
* Permission errors
* Rate-limit state
* Disconnect
* Delete discovery data

User actions:

* Confirm match
* Reject match
* Keep separate
* Accept cloud resource into architecture
* Mark intentionally unmanaged
* Refresh discovery
* Disconnect

---

## 10.7 — DISCONNECT AND DATA LIFECYCLE

Disconnect must:

* Stop future discovery
* Invalidate connector association
* Remove stored connection secret/reference as appropriate
* Preserve accepted architecture snapshots
* Mark cloud evidence disconnected
* Allow deletion of raw discovery metadata
* Update exports
* Update account deletion

Document what remains after disconnect.

---

## 10.8 — GCP AND AZURE SUB-CHECKPOINTS

After AWS passes, implement the same adapter contract.

GCP initial resources:

* Projects and regions
* VPC networks
* Subnetworks
* Firewall rules
* Load balancing
* Cloud Run
* GKE metadata
* Cloud Functions
* API Gateway
* Cloud SQL
* Memorystore
* Firestore
* Pub/Sub
* Cloud Storage
* Cloud CDN
* Monitoring references

Azure initial resources:

* Subscriptions and regions
* Virtual networks
* Subnets
* Network security groups
* Load balancers
* Front Door
* App Service
* Container Apps
* AKS metadata
* Functions
* API Management
* Azure Database services
* Azure Cache for Redis
* Cosmos DB
* Service Bus
* Storage
* Azure Monitor references

Keep each provider as a separately validated manual gate.

---

## 10.9 — TESTS

Use provider fixtures and mocks for automated tests.

Test:

* Connection validation
* Missing permission
* Expired credential
* Wrong account
* Region bounds
* Pagination bounds
* API timeout
* Rate limiting
* Retry limit
* Resource normalization
* Relationship extraction
* No mutation APIs
* No secret retrieval
* Reconciliation
* Drift
* Cross-user isolation
* Disconnect
* Account deletion
* Export
* Log redaction
* Accessibility
* Responsive UI

Add an explicit test that mutation-capable SDK methods are not invoked.

---

## 10.10 — MANUAL VALIDATION

Using a disposable read-only test account:

1. Configure delegated read-only connection.
2. Select one or two regions.
3. Validate connection.
4. Run discovery.
5. Verify supported resources.
6. Verify explicit relationships.
7. Confirm no mutation API activity.
8. Confirm one IaC match.
9. Confirm one drift item.
10. Disconnect.
11. Confirm future discovery fails safely.
12. Confirm accepted architecture remains.

---

## 10.11 — CHECKPOINT 10 COMPLETION

Classify each provider:

* CHECKPOINT 10A AWS: PASSING / MANUAL VALIDATION REQUIRED / BLOCKED
* CHECKPOINT 10B GCP: PASSING / MANUAL VALIDATION REQUIRED / BLOCKED
* CHECKPOINT 10C AZURE: PASSING / MANUAL VALIDATION REQUIRED / BLOCKED

Do not claim full multi-cloud discovery because only mock tests pass.

===============================================================================
CHECKPOINT 11 — RUNTIME TELEMETRY AND CALIBRATED SIMULATION
===========================================================

Purpose:

Use measured runtime data to calibrate the architecture model and deterministic
simulation engine.

Start with one telemetry source.

Preferred first options:

* OpenTelemetry metrics
* Prometheus HTTP API

Do not ingest broad raw traces or logs in the first implementation.

---

## 11.1 — TELEMETRY CONNECTION

Create TelemetryAdapter contract.

Conceptual operations:

* validateConnection
* listMetricSources
* queryAggregateMetrics
* mapResourceCandidates
* getConnectionStatus
* disconnect
* sanitizeError

Connection records should include:

* Provider/type
* Owner
* Safe endpoint identifier
* Auth configuration reference
* Connection status
* Last verified
* Last ingestion
* Retention configuration
* Created/updated timestamps

Do not expose telemetry credentials to the browser.

Do not log credentials or full metric responses.

---

## 11.2 — INITIAL METRICS

Support aggregate values such as:

* Requests per second
* Error rate
* p50 latency
* p95 latency
* p99 latency
* CPU utilization
* Memory utilization
* Database connections
* Query rate
* Queue depth
* Oldest queue-message age
* Consumer throughput
* Cache hit rate
* Storage size
* Storage growth
* Data egress
* External-dependency latency
* Retry rate
* Throttle rate

Every metric should include:

* Metric identity
* Component mapping
* Time window
* Aggregation
* Unit
* Value
* Source
* Query definition identifier
* Freshness
* Confidence

Avoid storing raw high-cardinality labels unnecessarily.

---

## 11.3 — COMPONENT MAPPING

Map telemetry to architecture components using:

* Explicit resource attributes
* Service names
* OpenTelemetry resource attributes
* Kubernetes metadata
* Cloud resource IDs
* Repository/service metadata
* User confirmation

Possible mapping outcomes:

* confirmed
* likely
* possible
* conflicting
* unresolved

Ambiguous mappings require user review.

Do not assign metrics to components solely by fuzzy name similarity.

---

## 11.4 — CALIBRATION MODEL

Simulation inputs must distinguish:

* runtime-measured
* user-supplied
* IaC-derived
* cloud-derived
* repository-derived
* product-default
* calculated

When measured data exists, it may replace a default only after:

* Mapping is confirmed
* Unit is validated
* Time window is visible
* Data is fresh enough
* The user accepts or enables automatic calibration

Keep historical input provenance.

Examples:

```text
Request rate:
Measured from OpenTelemetry, last 24 hours

Cache hit rate:
Measured from Prometheus, last 6 hours

Database capacity:
User supplied

Queue service rate:
Derived from measured consumer throughput

Region outage recovery time:
Product default
```

---

## 11.5 — CALIBRATED SIMULATION

Support:

* Baseline using measured values
* 2×, 5×, 10× scaling
* Cache degradation
* Worker slowdown
* Queue backlog
* External dependency outage
* Database connection exhaustion
* Region outage where modeled

Compare:

* Previous assumption-driven result
* Calibrated result
* Input changes
* Confidence changes
* First projected constraint
* Missing capacity inputs

Do not claim exact prediction.

Use:

“Estimated from measured baseline and supplied architecture parameters.”

---

## 11.6 — RUNTIME DRIFT

Detect discrepancies such as:

* Runtime service not represented in architecture
* Architecture component with no mapped telemetry
* Observed traffic path not represented
* Measured traffic greatly exceeds assumption
* Queue backlog not represented in baseline
* Cache hit rate differs materially from model
* Database connections near modeled limit
* Observed external dependency latency changes risk

Runtime drift must be reviewable.

Do not automatically modify architecture relationships from telemetry alone.

---

## 11.7 — VISUAL OVERLAYS

Add optional canvas overlays:

* Request rate
* Error rate
* Latency
* CPU
* Memory
* Database pressure
* Queue depth
* Cache hit rate
* Staleness
* Mapping confidence

Overlays must:

* Show time window
* Show units
* Avoid color-only communication
* Support reduced motion
* Avoid making old data appear live
* Allow filtering

---

## 11.8 — PRIVACY AND RETENTION

Document and implement:

* Aggregate metrics collected
* Raw metrics retained or not retained
* Retention period
* Disconnect behavior
* Deletion behavior
* Export behavior
* Account deletion
* Provider use
* No log-content ingestion
* No raw trace ingestion initially

Avoid collecting:

* Request bodies
* User identifiers
* URLs containing secrets
* Query text
* Raw logs
* Full span attributes without an allowlist

---

## 11.9 — TESTS

Test:

* Connection validation
* Credential redaction
* Metric-unit normalization
* Time-window validation
* Stale metrics
* Missing metrics
* Mapping confirmed
* Mapping ambiguous
* Mapping conflict
* Calibration provenance
* Default replacement
* User override
* Deterministic calibrated simulation
* Runtime drift
* Disconnect
* Data deletion
* Cross-user isolation
* Large metric response limits
* High-cardinality rejection
* Accessibility
* Responsive overlays

---

## 11.10 — MANUAL VALIDATION

Use a non-sensitive test telemetry source:

1. Connect OpenTelemetry or Prometheus.
2. Validate connection.
3. Map one API metric.
4. Map one database metric.
5. Leave one mapping unresolved.
6. Run baseline calibration.
7. Compare default versus measured values.
8. Run 10× simulation.
9. Confirm first projected constraint.
10. Disconnect.
11. Confirm measured data becomes disconnected/stale.
12. Confirm historical architecture remains.

---

## 11.11 — CHECKPOINT 11 COMPLETION

Run:

* Telemetry-adapter tests
* Mapping tests
* Calibration tests
* Simulation regressions
* Runtime-drift tests
* Privacy tests
* Authorization tests
* All existing tests
* Formatting
* Lint
* Typecheck
* Production build
* Bundle-secret scan
* Dependency audit

Classify:

* CHECKPOINT 11: PASSING
* CHECKPOINT 11: MANUAL VALIDATION REQUIRED
* CHECKPOINT 11: BLOCKED

===============================================================================
CHECKPOINT 12 — CONTROLLED INFRASTRUCTURE PULL REQUESTS
=======================================================

Purpose:

Convert an approved recommendation or migration plan into reviewable Terraform
or Kubernetes file changes and open a GitHub pull request only after explicit
approval.

This checkpoint must never deploy infrastructure.

---

## 12.1 — SAFETY BOUNDARY

Never:

* Push directly to the default branch
* Merge a pull request
* Approve a pull request automatically
* Run Terraform apply
* Run kubectl apply
* Run Helm upgrade/install
* Modify cloud resources
* Use owner/admin repository permissions
* Hide generated changes
* Commit secrets
* Modify files outside approved scope
* Reuse a stale architecture revision silently

Every action requires:

* Authenticated user
* Active workspace access
* Repository ownership
* GitHub installation permission
* Explicit source snapshot
* Explicit target snapshot
* Explicit change set
* Human review
* Explicit approval

---

## 12.2 — GITHUB PERMISSION UPGRADE

Repository analysis uses read-only permissions.

Controlled PR creation requires a separately enabled permission set:

* Contents: read and write
* Pull requests: read and write
* Metadata: read-only

Optionally:

* Checks: write for validation status

Do not request these permissions until the user enables Controlled Changes.

Create a manual permission-upgrade gate.

The product must continue to work read-only when write permissions are absent.

---

## 12.3 — INFRASTRUCTURE CHANGE SET

Create InfrastructureChangeSet containing:

* Change-set ID
* Workspace
* Repository
* Base branch
* Base commit SHA
* Source architecture snapshot
* Target architecture snapshot
* Related finding/recommendation/migration plan
* Proposed files
* Proposed patches
* Explanation
* Assumptions
* Risk
* Validation plan
* Rollback guidance
* Status
* Created-by user
* Created/updated timestamps

Statuses:

* draft
* ready-for-review
* approved
* branch-created
* pull-request-open
* rejected
* stale
* failed
* cancelled

Every changed file should include:

* Existing file hash
* Proposed content or patch
* Change reason
* Related architecture entity
* Syntax validation result
* Secret scan result
* User review state

---

## 12.4 — SUPPORTED OUTPUTS

Initial outputs:

Terraform:

* Add or update bounded supported resources
* Add references
* Add variables
* Add outputs
* Add security attachments
* Add queue/dead-letter configuration
* Add observability resources where cataloged

Kubernetes:

* Add or update Deployment
* Service
* Ingress
* ConfigMap references
* Secret references by name only
* HPA
* NetworkPolicy
* PVC
* ServiceAccount

Do not generate:

* Secret values
* Cloud credentials
* Kubeconfig
* Terraform state
* Destructive resource deletion without a dedicated later workflow
* Broad IAM admin policies
* Public exposure without explicit warning and confirmation

Initial checkpoint should prefer additive or narrowly bounded modifications.

Resource deletion should be marked unsupported or require a separate elevated
review path.

---

## 12.5 — GENERATION PIPELINE

Workflow:

1. User selects recommendation or migration plan.
2. Product verifies source snapshot is current.
3. Product identifies supported target files.
4. Product creates typed implementation intent.
5. Deterministic generator or bounded AI adapter proposes patches.
6. Parse generated Terraform/Kubernetes.
7. Validate supported structure.
8. Run secret scan.
9. Compare architecture impact.
10. Show file diff.
11. Show architecture diff.
12. Show risks.
13. User edits or rejects.
14. User explicitly approves.
15. Product creates dedicated branch.
16. Product commits only approved files.
17. Product opens pull request.
18. Product records PR.
19. Product never merges or deploys.

AI may generate candidate text only from:

* Approved architecture change
* Supported schema/catalog
* Bounded existing-file context
* Redacted evidence

AI output must be parsed and validated.

Invalid output fails safely.

---

## 12.6 — STATIC VALIDATION

Terraform validation must be non-executing.

Use:

* HCL parse
* HCL formatting/round-trip
* Supported-resource validation
* Reference checks where statically possible
* Secret scan
* Policy checks

Do not run:

* terraform init
* terraform plan
* terraform apply
* Provider evaluation

Kubernetes validation:

* YAML parse
* Multi-document validation
* Supported-kind validation
* Offline schema validation using versioned schemas where practical
* Selector/reference checks
* Secret-value rejection
* Policy checks

Do not contact a cluster.

---

## 12.7 — DIFF AND REVIEW

Show:

* Current architecture
* Target architecture
* Architecture diff
* Existing file
* Proposed file
* Line diff
* Related finding
* Assumptions
* Risks
* Validation
* Rollback
* Unsupported effects

Require confirmation for:

* New public exposure
* IAM changes
* Database changes
* Network changes
* Region changes
* Data-store replacement
* Queue semantics changes
* Resource deletion
* Major cost-impact changes when cost data exists

No “apply all” without detailed review.

---

## 12.8 — BRANCH AND PULL REQUEST

Use:

* Dedicated branch
* Predictable safe branch name
* Base commit verification
* Idempotent branch creation
* Commit with safe message
* Pull request with structured body

PR body should contain:

* Reason
* Architecture change
* Files
* Validation performed
* Assumptions
* Risks
* Rollback guidance
* Related finding or migration plan
* Links to product review where safe

Do not include:

* Private source content beyond normal diff
* Secrets
* Installation tokens
* Database information
* Internal user IDs
* Raw model output

If base branch has changed:

* Mark change set stale
* Do not force push
* Require regeneration or explicit rebase review

---

## 12.9 — AUDIT TRAIL

Record:

* User who requested generation
* User who approved
* Source snapshot
* Target snapshot
* Repository
* Base commit
* Branch
* Commit
* Pull request
* Files
* Validation
* Errors
* Cancellation
* Timestamps

Do not log source file bodies in operational logs.

---

## 12.10 — DISCONNECT AND FAILURE

Handle:

* Installation permission removed
* Branch already exists
* Base commit changed
* Repository archived
* Repository transferred
* Rate limiting
* Validation failure
* Secret detected
* Unsupported construct
* Partial GitHub failure
* PR creation failure
* Cancellation

A failure must not:

* Leave a hidden unreviewed commit
* Claim a PR exists when it does not
* Modify default branch
* Expose credentials
* Lose the reviewed change set

Provide cleanup guidance for orphaned branches.

---

## 12.11 — TESTS

Test:

* Write permission absent
* Permission upgrade required
* Wrong owner
* Wrong repository
* Stale source snapshot
* Stale base commit
* Supported Terraform generation
* Unsupported Terraform generation
* Supported Kubernetes generation
* Secret-value rejection
* Invalid HCL
* Invalid YAML
* Public-exposure warning
* IAM warning
* Database-change warning
* Architecture diff
* File diff
* Approval required
* Branch creation
* Commit creation
* PR creation
* Idempotent retry
* Partial failure
* Rate limit
* No default-branch push
* No merge
* No apply
* Cross-user isolation
* Log redaction
* Account export
* Account deletion
* Accessibility
* Responsive review UI

Use fake GitHub APIs for automated tests.

---

## 12.12 — MANUAL VALIDATION

Use a non-sensitive test repository.

1. Enable write permissions for the GitHub App.
2. Select an approved recommendation.
3. Generate a Terraform or Kubernetes change.
4. Review architecture diff.
5. Review file diff.
6. Reject one generated version.
7. Regenerate.
8. Approve the final change.
9. Confirm dedicated branch creation.
10. Confirm one commit.
11. Confirm one pull request.
12. Confirm default branch unchanged.
13. Confirm no merge.
14. Confirm no infrastructure execution.
15. Close the test PR.
16. Remove write permission.
17. Confirm analysis remains read-only.

---

## 12.13 — CHECKPOINT 12 COMPLETION

Run:

* Change-set tests
* Terraform generation tests
* Kubernetes generation tests
* Static-validation tests
* Secret-scan tests
* GitHub branch/PR tests
* Authorization tests
* Failure tests
* Audit-trail tests
* All existing tests
* Formatting
* Lint
* Typecheck
* Production build
* Bundle-secret scan
* Dependency audit

Classify:

* CHECKPOINT 12: PASSING
* CHECKPOINT 12: MANUAL VALIDATION REQUIRED
* CHECKPOINT 12: BLOCKED

Do not classify as passing based only on fake GitHub API tests when the live
write-permission flow has not been validated.

===============================================================================
SECTION 4 — SHARED SECURITY REQUIREMENTS
========================================

All routes and actions introduced in Checkpoints 6–12 must enforce:

* Authenticated session
* Workspace access
* Project ownership
* Source-connection ownership
* Repository ownership
* Snapshot ownership
* Scenario ownership
* Change-set ownership

Do not trust:

* Client-provided user IDs
* Client-provided owner IDs
* Client-provided installation IDs
* Client-provided cloud account IDs
* Client-provided telemetry ownership
* Client-selected repository authorization

Use safe not-found behavior for inaccessible resources.

Use existing protections:

* Same-origin mutation guards
* Content-type validation
* Request-size limits
* CSRF protections where applicable
* No-store private responses
* Optimistic concurrency
* Structured safe errors
* Secret-redacted logs

Never log:

* Source files
* Repository archives
* GitHub tokens
* GitHub App private key
* Webhook secret
* Cloud credentials
* Telemetry credentials
* Terraform state
* Kubernetes secrets
* ArchitectureDocument JSON
* Raw migration plans
* Generated file bodies
* Provider API response bodies

Allowed safe logs may include:

* Internal user subject
* Workspace ID
* Connection ID
* Repository ID
* Commit SHA
* Snapshot ID
* Analysis run ID
* Discovery run ID
* Telemetry run ID
* Change-set ID
* Operation
* Duration
* Counts
* Safe error code
* HTTP status

===============================================================================
SECTION 5 — SHARED PERFORMANCE REQUIREMENTS
===========================================

Use bounded workloads.

Add configurable limits for:

* Repository files
* IaC resources
* Snapshot size
* Snapshot count
* Diff size
* Webhook payloads
* Changed files
* Cloud regions
* Cloud API calls
* Cloud resources
* Telemetry metrics
* Telemetry time ranges
* Scenario runs
* Migration mappings
* Generated file count
* Generated bytes
* GitHub API calls
* Background jobs

Use caching where safe:

* File blob SHA + extractor version
* Snapshot semantic hash
* Cloud resource version where available
* Telemetry query and window
* Capability-catalog version
* Migration mapping version

Do not rely on in-memory global state for correctness.

===============================================================================
SECTION 6 — SHARED DATA LIFECYCLE
=================================

Update:

* Project export
* Account export
* Project deletion
* Account deletion
* Repository disconnect
* Cloud disconnect
* Telemetry disconnect
* Evidence deletion
* Snapshot retention
* Change-set deletion

Exports must exclude:

* GitHub tokens
* Cloud credentials
* Telemetry credentials
* Webhook secrets
* Terraform state
* Kubernetes secret values
* Raw private repository files
* Generated secrets
* Internal logs
* Database internals

Document behavior accurately in:

* Privacy
* Data Handling
* Security/Trust
* Account settings
* Integration settings

===============================================================================
SECTION 7 — SEQUENTIAL EXECUTION PROTOCOL
=========================================

Execute checkpoints in dependency order.

For each checkpoint:

1. Read this document.
2. Read CHECKPOINT_STATUS.md.
3. Inspect current implementation.
4. Verify prior checkpoint status.
5. Identify existing reusable functionality.
6. Identify exact gaps.
7. Present implementation plan.
8. Present security design.
9. Present migration plan.
10. Implement only the current checkpoint.
11. Add tests.
12. Run validation.
13. Update documentation.
14. Update CHECKPOINT_STATUS.md.
15. Produce checkpoint report.
16. Stop at any manual gate.
17. Resume only after explicit confirmation.

Do not continue automatically when:

* External GitHub App permissions are required
* Webhooks must be configured manually
* Cloud-account permissions are required
* Telemetry credentials are required
* Database migration needs approval
* A destructive action is required
* A paid resource is required
* Repository state is ambiguous
* A security test fails
* Cross-user access is possible
* Secrets are exposed
* A manual validation is required for honest completion

When stopping for a manual gate, provide:

* Current checkpoint
* Completed work
* Exact manual steps
* Required environment-variable names
* Where values should be configured
* Verification steps
* Exact resume sentence

Do not ask the user to paste secrets into chat.

===============================================================================
SECTION 8 — CHECKPOINT REPORT FORMAT
====================================

Every checkpoint report must include:

* Checkpoint
* Status
* Existing functionality reused
* Files changed
* Migrations
* Domain-model changes
* Security model
* User experience
* Extractors/adapters/catalogs added
* Tests added
* Test results
* Build result
* Bundle-secret scan
* Dependency findings
* Manual validation
* Known limitations
* Deferred capabilities
* Remaining blockers
* Next checkpoint
* Full-product completion estimate

Use one exact status:

* CHECKPOINT N: PASSING
* CHECKPOINT N: MANUAL VALIDATION REQUIRED
* CHECKPOINT N: BLOCKED

Do not claim live integration verification when only mocks were used.

===============================================================================
SECTION 9 — STARTING INSTRUCTION
================================

Perform the following now:

1. Inspect the complete repository.
2. Read existing checkpoint reports.
3. Read CHECKPOINT_STATUS.md.
4. Run the baseline test suite.
5. Verify the actual status of Checkpoint 5.
6. Identify whether Checkpoint 6 has started.
7. Compare the implementation against this contract.
8. Update the checkpoint ledger.
9. Implement the first incomplete checkpoint.
10. Validate it.
11. Stop according to the sequential execution protocol.

Do not begin Checkpoint 7 before Checkpoint 6 is complete.

Do not begin Checkpoint 8 before snapshot and diff correctness is established.

Do not begin Checkpoint 9 before ArchitectureDocument, proposals, and scenario
isolation are stable.

Do not begin Checkpoint 10 before cross-source reconciliation is trustworthy.

Do not begin Checkpoint 11 before component identity is stable enough for metric
mapping.

Do not begin Checkpoint 12 before repository analysis, snapshots, migration
planning, and GitHub authorization boundaries are mature.

````

## What this gives Claude Code

This prompt creates a clear dependency chain:

```text
Terraform and Kubernetes truth
→ immutable snapshots
→ commit and PR monitoring
→ AWS-to-GCP alternatives
→ real cloud reconciliation
→ measured runtime behavior
→ controlled infrastructure changes
````

It prevents the modules from becoming disconnected features. A Terraform resource, GitHub commit, discovered RDS instance, Prometheus metric, migration mapping, and generated pull request must all point back to the same stable architecture entities and evidence history.

Use it after Checkpoint 5. Claude Code should first report the existing implementation and the exact Checkpoint 6 gap—not jump directly into Checkpoint 12.
