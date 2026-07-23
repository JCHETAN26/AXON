===============================================================================
UI DESIGN CONSTITUTION AND VISUAL SOURCE OF TRUTH
===============================================================================

The functional requirements in this build plan do not give permission to invent
a new visual style for each checkpoint.

Before implementing any user-facing screen, inspect:

1. The existing application shell
2. Existing production UI components
3. Existing Tailwind/theme tokens
4. Existing canvas implementation
5. Existing responsive behavior
6. Existing files under `docs/design`
7. Approved reference images under `docs/design/references`
8. Existing Stitch, Lovable, Figma, or design exports stored in the repository

The source-of-truth priority is:

1. Approved reference screens
2. Existing shared design-system components
3. UI_CONSTITUTION.md
4. Screen-specific blueprint
5. This checkpoint specification
6. New design decisions made only when none of the above resolves the issue

Do not introduce a competing visual language.

Do not redesign previously approved screens merely because another implementation
would be easier.

Do not use generic dashboard templates.

Do not create visually disconnected checkpoint pages.

Do not treat functional completeness as visual completeness.

-------------------------------------------------------------------------------
VISUAL PRODUCT DIRECTION
-------------------------------------------------------------------------------

The product should feel like a professional spatial architecture workspace.

It should combine:

- The clarity of a modern developer platform
- The spatial interaction of a professional diagram editor
- The analytical depth of an observability product
- The restraint of a high-end cloud engineering tool

The product should not feel like:

- A generic admin dashboard
- A collection of cards
- A marketing website inside the application
- A spreadsheet with a diagram attached
- A low-code builder
- A toy AI generator
- A collection of disconnected modals
- A clone of GitHub, AWS Console, Grafana, or Jira

The architecture canvas is the center of the product.

Supporting information should appear through:

- Contextual side panels
- Bottom drawers
- Inspectors
- Overlay controls
- Compact toolbars
- Focused workspaces
- Synchronized tables
- Timeline panels
- Diff panels

Avoid replacing the canvas with full-screen tables when the information can be
connected visually to architecture entities.

-------------------------------------------------------------------------------
APPLICATION SHELL
-------------------------------------------------------------------------------

Use one consistent authenticated application shell.

Desktop structure:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Global top bar                                                          │
├──────────────┬──────────────────────────────────────────┬────────────────┤
│ Workspace    │                                          │ Contextual     │
│ navigation   │          Main architecture canvas        │ inspector      │
│              │                                          │ or evidence    │
│              │                                          │ panel          │
├──────────────┴──────────────────────────────────────────┴────────────────┤
│ Optional timeline, job status, diff, simulation, or file drawer         │
└──────────────────────────────────────────────────────────────────────────┘



===============================================================================
SHARED UI IMPLEMENTATION CONTRACT
===============================================================================

Every checkpoint in this document includes complete user-interface
implementation.

A checkpoint must not be classified as PASSING when only domain models, APIs,
database migrations, adapters, or automated tests exist.

Every user-facing capability must be implemented end to end:

Domain model
→ persistence
→ server services
→ authenticated API/routes
→ client data layer
→ production-quality UI
→ real interaction states
→ end-to-end validation

Do not create placeholder pages, static mock screens, disconnected prototypes,
or TODO-only interfaces.

Reuse the existing design system, layout primitives, canvas architecture,
typography, spacing, icons, dialogs, forms, notifications, and accessibility
patterns.

Do not introduce a second unrelated visual system.

-------------------------------------------------------------------------------
UI QUALITY REQUIREMENTS
-------------------------------------------------------------------------------

Every new user-facing screen must include:

- Clear page title and product purpose
- Primary action
- Secondary actions
- Breadcrumb or workspace context where useful
- Loading state
- Empty state
- Success state
- Partial-success state
- Error state
- Permission-denied state
- Disconnected-source state
- Stale-data state
- Retry action
- Destructive-action confirmation
- Keyboard navigation
- Visible focus state
- Screen-reader labels
- Reduced-motion support
- Mobile behavior at 390px
- Tablet behavior
- Desktop behavior
- No unintended horizontal overflow
- No secret or credential values rendered to the client

Use skeletons or progress indicators for long-running analyses.

For asynchronous jobs, display:

- Queued
- Running
- Progress where measurable
- Completed
- Failed
- Cancelled
- Retry available
- Safe error summary

Do not fabricate percentage progress when progress cannot actually be measured.

-------------------------------------------------------------------------------
ARCHITECTURE CANVAS INTEGRATION
-------------------------------------------------------------------------------

New architecture intelligence must integrate into the existing visual canvas.

Do not build major capabilities as tables that remain disconnected from the
diagram.

The canvas must support the relevant overlays and interactions for each
checkpoint:

Checkpoint 6:
- Terraform evidence overlay
- Kubernetes evidence overlay
- Source-layer filtering
- Match-candidate indicators
- Conflict indicators
- Unsupported-resource indicators

Checkpoint 7:
- Snapshot selection
- Added/removed/changed node overlays
- Relationship diff overlays
- Evidence-change overlays
- Drift status indicators

Checkpoint 8:
- Pull-request base/head comparison
- Changed-component highlighting
- Changed-relationship highlighting
- Affected-path visualization
- Introduced/resolved finding overlays

Checkpoint 9:
- AWS source architecture
- GCP target architecture
- Side-by-side view
- Synchronized selection
- Mapping lines
- Migration-phase filtering
- Current/Target/Diff view

Checkpoint 10:
- Cloud-discovered resource overlay
- Declared-versus-discovered status
- Match candidates
- Unmanaged-resource indicators
- Permission and staleness indicators

Checkpoint 11:
- Request-rate overlay
- Error-rate overlay
- Latency overlay
- CPU/memory overlay
- Queue-depth overlay
- Cache-hit-rate overlay
- Metric freshness and provenance

Checkpoint 12:
- Source architecture
- Target architecture
- Proposed infrastructure-change overlay
- Architecture diff linked to file diff
- Risk indicators
- Approval state

Selecting an item in a table, evidence panel, timeline, pull-request review,
migration mapping, metric list, or file diff should focus the corresponding
canvas entity where one exists.

Selecting a canvas entity should update the related evidence and detail panels.

-------------------------------------------------------------------------------
CHECKPOINT 6 UI
-------------------------------------------------------------------------------

Implement an Infrastructure Intelligence workspace containing:

- Analysis-run summary
- Source repository and commit
- Terraform resources
- Kubernetes resources
- Source-code components
- Match candidates
- Conflicts
- Unsupported resources
- Unresolved expressions
- Evidence browser
- Proposal review
- Current / Proposed / Diff
- Apply-reviewed-changes flow

Provide filters for:

- Source layer
- Provider
- Resource type
- Confidence
- Conflict state
- Review state

Every proposed item must support:

- Accept
- Reject
- Edit
- Keep separate
- Confirm match
- Mark unresolved
- View evidence

-------------------------------------------------------------------------------
CHECKPOINT 7 UI
-------------------------------------------------------------------------------

Implement an Architecture History workspace containing:

- Snapshot timeline
- Snapshot metadata
- Commit/source information
- Snapshot comparison selector
- Semantic change summary
- Canvas diff
- Evidence diff
- Finding history
- Drift queue
- Reconciliation controls
- Restore-as-new-revision
- Fork-as-scenario

Never allow history to be overwritten.

-------------------------------------------------------------------------------
CHECKPOINT 8 UI
-------------------------------------------------------------------------------

Implement a GitHub Changes workspace containing:

- Repository selector
- Commit activity
- Pull-request list
- Analysis status
- Base/head commits
- Changed files
- Architecture diff
- Affected components
- Affected user paths
- Introduced findings
- Resolved findings
- Evidence
- Confidence
- Limitations
- Reanalysis action
- Reconciliation action

A pull-request review must be understandable without opening raw JSON.

-------------------------------------------------------------------------------
CHECKPOINT 9 UI
-------------------------------------------------------------------------------

Implement an AWS-to-GCP Migration Workspace containing:

- Source snapshot selector
- Requirements and constraints
- AWS architecture canvas
- GCP target canvas
- Mapping table
- Mapping alternatives
- Semantic-difference panel
- Unresolved decision queue
- Current / Target / Diff
- Audit comparison
- Simulation comparison
- Cost section or explicit unavailable state
- Migration phases
- Risks
- Validation steps
- Rollback considerations
- Export
- Accept-as-scenario
- Explicit apply flow

Use synchronized highlighting between source components, target components, and
mapping rows.

-------------------------------------------------------------------------------
CHECKPOINT 10 UI
-------------------------------------------------------------------------------

Implement a Cloud Discovery workspace containing:

- Provider connection cards
- Permission explanation
- Scope/region selection
- Connection validation
- Discovery runs
- Resource inventory
- Cloud architecture overlay
- Declared-versus-discovered comparison
- Match candidates
- Drift
- Unsupported resources
- Permission failures
- Rate-limit state
- Refresh
- Disconnect
- Delete-discovery-data flow

Never display cloud credentials.

-------------------------------------------------------------------------------
CHECKPOINT 11 UI
-------------------------------------------------------------------------------

Implement a Runtime Intelligence workspace containing:

- Telemetry connection
- Metric-source selection
- Time-window selection
- Metric-to-component mapping
- Confirmed mappings
- Ambiguous mappings
- Measured-versus-assumed input table
- Runtime drift
- Calibrated simulation comparison
- Canvas metric overlays
- Metric freshness
- Disconnect and deletion controls

Do not use the word “live” for stale or periodically imported data.

Always display the data timestamp and time window.

-------------------------------------------------------------------------------
CHECKPOINT 12 UI
-------------------------------------------------------------------------------

Implement an Infrastructure Change Review workspace containing:

- Related finding or migration plan
- Source snapshot
- Target snapshot
- Architecture diff
- Proposed files
- Side-by-side file diff
- Syntax-validation result
- Secret-scan result
- Policy warnings
- Risk warnings
- Assumptions
- Validation commands
- Rollback guidance
- Approval controls
- Branch status
- Commit status
- Pull-request status
- Cancellation and retry

High-risk changes must receive prominent, non-dismissible review warnings until
the user explicitly acknowledges them.

Examples:

- Public exposure
- IAM permissions
- Database changes
- Network changes
- Region changes
- Data-store replacement
- Queue semantic changes
- Resource deletion

-------------------------------------------------------------------------------
DESIGN AND VISUAL QUALITY
-------------------------------------------------------------------------------

The UI should look like one polished architecture product, not a collection of
admin screens.

Prefer:

- Canvas-first workflows
- Contextual side panels
- Progressive disclosure
- Clear information hierarchy
- Compact but readable tables
- Evidence chips
- Confidence badges
- Source-layer badges
- Semantic diff colors plus icons/text
- Useful empty states
- Consistent destructive confirmations
- Smooth but restrained transitions

Avoid:

- Giant forms
- Raw JSON as the primary interface
- Excessive modal nesting
- Unexplained technical identifiers
- Color-only status communication
- Tables with no connection to the architecture canvas
- Placeholder charts
- Fake metrics
- Fake progress
- Decorative dashboards without actions

-------------------------------------------------------------------------------
END-TO-END UI TESTING
-------------------------------------------------------------------------------

Every checkpoint must include Playwright or the repository’s established
end-to-end tests for its main workflow.

Tests must verify:

- Successful workflow
- Empty state
- Loading state
- Failure state
- Permission denial
- Stale/disconnected state
- Optimistic-concurrency conflict
- Destructive confirmation
- Keyboard navigation
- Mobile layout
- Canvas-to-panel selection synchronization
- No secrets in rendered HTML, browser storage, or client network payloads

A checkpoint cannot be PASSING when its primary UI exists only behind mocked
static data unless the checkpoint explicitly records MANUAL VALIDATION REQUIRED.

-------------------------------------------------------------------------------
UI COMPLETION REPORT
-------------------------------------------------------------------------------

Every checkpoint report must additionally include:

- Routes/screens added
- Components added
- Existing design-system components reused
- Canvas integrations
- Loading/empty/error states
- Accessibility results
- Responsive results
- End-to-end UI test results
- Screens requiring manual validation
- Known visual limitations




You can use DESIGN.md for the design reference.