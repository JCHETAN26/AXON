---
name: Spatial Architecture
version: 1.0
status: approved

colors:
  light:
    background: '#f9f9f9'
    surface: '#ffffff'
    surface-muted: '#f3f3f3'
    surface-subtle: '#eeeeee'
    foreground: '#1a1c1c'
    foreground-muted: '#5f6262'
    border: '#cfcfcf'
    border-strong: '#7e7576'
    grid: '#eeeeee'
    primary: '#000000'
    primary-foreground: '#ffffff'
    accent: '#0042c7'
    accent-strong: '#0056fd'
    accent-muted: '#e4e7ff'
    critical: '#ba1a1a'
    critical-muted: '#ffdad6'
    warning: '#a64b00'
    warning-muted: '#ffdbd0'
    success: '#2e7d32'
    success-muted: '#d9efdc'

  dark:
    background: '#121212'
    surface: '#1e1e1e'
    surface-muted: '#181818'
    surface-subtle: '#252525'
    foreground: '#f3f3f3'
    foreground-muted: '#a5a5a5'
    border: '#353535'
    border-strong: '#626262'
    grid: '#1e1e1e'
    primary: '#ffffff'
    primary-foreground: '#121212'
    accent: '#5f82ff'
    accent-strong: '#8ca4ff'
    accent-muted: '#182659'
    critical: '#ff766d'
    critical-muted: '#471b19'
    warning: '#ffad66'
    warning-muted: '#492912'
    success: '#70c77a'
    success-muted: '#17351d'

typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 72px
    fontWeight: '700'
    lineHeight: 0.9
    letterSpacing: -0.04em

  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 0.95
    letterSpacing: -0.025em

  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 1
    letterSpacing: -0.025em

  headline-md:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 1.15
    letterSpacing: -0.015em

  body-lg:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 1.55

  body-md:
    fontFamily: Space Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 1.55

  label-caps:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
    textTransform: uppercase

  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px

spacing:
  base-unit: 8px
  page-padding-desktop: 64px
  page-padding-tablet: 32px
  page-padding-mobile: 20px
  section-spacing-desktop: 96px
  section-spacing-mobile: 64px
  canvas-grid-size: 40px

shape:
  module-radius: 0px
  control-radius: 2px
  process-radius: 9999px

motion:
  fast: 150ms
  standard: 250ms
  deliberate: 500ms
  flow-duration: 8s
---

# Spatial Architecture Design System

## 1. Brand foundation

Spatial Architecture is the visual language for AXON, a living architecture-intelligence platform.

AXON helps people responsible for software systems:

- Generate architecture from ideas
- Understand existing infrastructure
- Audit security, reliability and scalability
- Simulate traffic and failure scenarios
- Compare current and recommended systems
- Connect runtime telemetry
- Work locally through MCP and CLI tooling

The interface should communicate that AXON is not merely a diagramming application. It is a workspace for designing, validating and operating production systems.

The emotional qualities of the brand are:

- Precise
- Calm
- Technical
- Intelligent
- Credible
- Deliberate
- Modern
- Visually memorable

The product should feel sophisticated without becoming theatrical, futuristic without becoming cyberpunk, and technical without sacrificing clarity.

## 2. Visual philosophy

The design combines:

- Architectural drafting
- Technical minimalism
- Controlled brutalism
- Modern developer-tool interfaces
- Spatial product storytelling

The interface should resemble a living technical document or interactive system blueprint.

It uses:

- Visible grid structures
- Sharp rectangular modules
- Fine architectural lines
- High-contrast typography
- Restrained color
- Large areas of intentional whitespace
- Technical metadata used selectively
- Blueprint-blue active states

The architecture canvas is the central visual metaphor across the marketing site and product.

Avoid turning every surface into a traditional card-based dashboard.

## 3. Visual restrictions

Do not use:

- Cyan-and-purple gradient branding
- Glowing AI orbs
- Large blurry gradient backgrounds
- Neon cyberpunk imagery
- Excessive glassmorphism
- Robot illustrations
- Sparkles or “AI magic” effects
- Generic chatbot interfaces
- Repetitive three-card feature layouts
- Excessive rounded containers
- Decorative motion without product meaning
- Fake customer logos or usage statistics

The interface should look intentionally designed, not generated from a generic AI SaaS template.

## 4. Color system

### Primary structural colors

Black and near-black are used for:

- Primary typography
- Structural borders
- Strong dividers
- Primary buttons
- Important architecture nodes

Warm white and architectural gray are used for:

- Canvas backgrounds
- Product surfaces
- Grid lines
- Secondary modules
- Empty architecture states

### Blueprint blue

Blueprint blue is the central brand accent.

Use it for:

- Selected architecture nodes
- Active connection paths
- Primary interactive states
- Simulation flows
- Recommended architecture additions
- Links and focused controls
- Important technical annotations

Do not use blue as a general decorative fill across large sections.

### Semantic status colors

Use status colors consistently:

- Red: critical failure, destructive risk or system outage
- Amber: warning, projected bottleneck or incomplete configuration
- Green: healthy state, verified connection or successful action
- Blue: selected, active, recommended or informational

Status must never be communicated by color alone. Include an icon, label, border pattern or text indicator.

## 5. Typography

### Space Grotesk

Use Space Grotesk for:

- Headlines
- Marketing copy
- Product descriptions
- Section titles
- Standard interface text
- Buttons when the label is not highly technical

It provides the primary brand voice.

### Geist

Use Geist for:

- Navigation
- Compact labels
- Utility controls
- Uppercase button labels
- Status labels
- Small interface headings

### JetBrains Mono

Reserve JetBrains Mono for:

- Architecture service identifiers
- Metrics
- CLI commands
- MCP examples
- Configuration values
- File paths
- Simulation parameters
- Logs
- Technical metadata
- Coordinates
- Evidence references

Do not use monospace for paragraphs or long-form body copy.

## 6. Layout

### Structural grid

Use a subtle 40px architectural grid across major canvas surfaces.

The grid should:

- Remain visible but subdued
- Support alignment
- Reinforce the architecture metaphor
- Avoid interfering with text readability

### Desktop

At 1440px and above:

- Use expansive layouts
- Allow controlled asymmetry
- Reserve large areas for architecture diagrams
- Keep product modules aligned to an underlying 12-column grid
- Allow architectural connections to cross between content zones

### Tablet

Between 768px and 1024px:

- Use a 6-column layout
- Simplify connection paths
- Convert secondary side panels into drawers
- Preserve the main architecture view

### Mobile

Below 768px:

- Use a single-column content structure
- Replace full canvases with focused architecture states
- Avoid squeezing complex desktop diagrams into the viewport
- Use horizontal scrolling only for purposeful comparisons
- Preserve clear CTA hierarchy

## 7. Spacing

Use the 8px spacing system.

Recommended values:

- 4px: metadata separation
- 8px: compact control spacing
- 16px: component internal spacing
- 24px: standard module padding
- 32px: large module padding
- 48px: grouped content separation
- 64px: mobile section separation
- 96px: desktop section separation
- 128px: major storytelling transitions where justified

Whitespace should create focus and hierarchy. It should not leave sections looking unfinished.

## 8. Shape language

### Default modules

Architecture and product modules should use:

- Sharp rectangular geometry
- 0px border radius
- 1px or 2px borders
- Minimal fill
- Clear internal hierarchy

### Utility controls

Small interface controls may use a radius of up to 2px where it improves usability.

### Circles

Circular forms are allowed only for:

- Processing engines
- Connection points
- Loading states
- Status dots
- Flow indicators
- Architecture ports
- Theme controls

Do not use circular cards or rounded containers as a general visual pattern.

## 9. Elevation and shadows

The system avoids soft, conventional card shadows.

Use elevation only for major surfaces such as:

- Primary architecture canvas
- Floating audit inspector
- Context menu
- Simulation control panel
- Command palette
- Modal dialog

Approved elevation treatment:

- Blueprint-blue or neutral offset shadow
- 4px to 24px offset
- No blur or minimal blur
- Low opacity
- Sharp architectural appearance

Standard modules should rely on borders and tonal contrast instead of shadows.

## 10. Architecture nodes

Architecture nodes are the core product primitive.

Each node may contain:

- Service category
- Service name
- Provider icon
- Environment
- Health state
- Compact metrics
- Warning indicator
- Selection state
- Source-binding indicator

Node rules:

- Service name must remain readable at normal viewport scale
- Metadata should use JetBrains Mono
- The selected node uses a blue border or blueprint offset
- Critical nodes use a red semantic border
- Recommended additions may use blue tint or dashed blue borders
- Planned nodes should use a dashed neutral border
- Locked nodes should display a visible lock indicator
- Do not rely on shadows to distinguish every node

## 11. Architecture edges

Edges communicate system behavior, not decoration.

Use distinct but restrained patterns:

- Solid line: synchronous request
- Short dash: asynchronous event
- Long dash: data access or replication
- Fine dotted line: telemetry
- Double-line or labeled line: bidirectional communication

Active traffic paths use blueprint blue.

Critical paths may transition to red during simulation or monitoring.

Include arrowheads when direction matters.

Animate edges only when demonstrating:

- Request flow
- Event movement
- Traffic escalation
- Architecture generation
- Simulation
- Live telemetry

Inactive diagrams should remain mostly still.

## 12. Architecture groups

Use group boundaries for:

- Public edge
- Application layer
- Data layer
- Observability
- Cloud region
- Availability zone
- Kubernetes cluster
- VPC
- Private subnet
- External systems

Groups should use:

- Fine dashed or solid boundaries
- Small uppercase labels
- Minimal background tint
- Clear nesting hierarchy

## 13. Buttons

### Primary

- Black background in light mode
- White background in dark mode
- High contrast
- Rectangular shape
- Geist uppercase label
- Optional blueprint offset on hover

### Secondary

- Transparent background
- Strong border
- Clear hover fill
- No unnecessary shadow

### Technical action

Used inside the product for actions such as:

- Run Audit
- Simulate Traffic
- View Evidence
- Preview Change
- Apply Patch

These may use JetBrains Mono or Geist depending on context.

Public marketing CTAs should use clear language rather than internal system terminology.

Preferred CTA examples:

- Start Building Free
- Build Your First Architecture
- View Interactive Demo
- Run Locally with MCP
- Preview Change

## 14. Inputs

Standard inputs use:

- Clear visible label
- Strong focus state
- Minimal border treatment
- Blueprint-blue active border
- Accessible error message
- High-contrast cursor and text

Technical inputs may include:

- Units
- Monospace values
- Inline parameters
- Status indicators

## 15. Findings and audit states

Every finding should communicate:

- Title
- Severity
- Confidence
- Evidence source
- Explanation
- Assumptions
- Recommendation
- Available action

Finding states:

- Critical
- High
- Medium
- Low
- Informational
- Verified healthy

The interface must distinguish:

- Measured telemetry
- Parsed configuration
- User-provided assumptions
- Deterministic calculations
- AI-inferred conclusions

## 16. Simulation

Simulation interfaces should show:

- User-controlled parameters
- Scenario presets
- Current traffic
- Projected load
- Component saturation
- Queue backlog
- Latency change
- Error rate
- Scaling behavior
- First projected constraint

Every simulation result must indicate whether it is:

- Measured
- Calculated
- Estimated
- AI-inferred

Projected outcomes must not be presented as production benchmarks.

## 17. Monitoring

Runtime metrics should be overlaid directly on architecture nodes.

Metrics may include:

- Requests per second
- p95 and p99 latency
- Error rate
- Queue lag
- CPU and memory
- Database connections
- Cache-hit rate
- Consumer throughput

Monitoring overlays should remain compact and should not obscure the architecture.

Root-cause explanations must include evidence and confidence.

## 18. Motion

Motion must explain system behavior.

Approved uses:

- Nodes appearing in dependency order
- Traffic flowing through active edges
- Audit markers revealing progressively
- Simulation load increasing
- Recommended nodes appearing in a diff
- Metrics updating smoothly
- Panels entering and leaving contextually
- Theme transitions
- Canvas pan and zoom demonstrations

Avoid:

- Constant pulsing
- Decorative parallax
- Excessive spring effects
- Slow cinematic transitions
- Motion that blocks interaction
- Animating every visible edge simultaneously

Respect `prefers-reduced-motion`.

When reduced motion is enabled:

- Stop continuous edge animation
- Replace animated flows with static highlighted paths
- Remove large transition effects
- Preserve all information through labels and state changes

## 19. Light and dark themes

Light and dark modes are equal product experiences.

Dark mode must not simply invert colors.

It should use:

- Graphite surfaces
- Muted borders
- Reduced grid contrast
- Softer white typography
- Slightly brighter blueprint blue
- Controlled semantic colors

Every component must be reviewed in both modes.

Do not hard-code `white`, `black` or arbitrary gray values inside reusable components. Use semantic design tokens.

## 20. Accessibility

All production interfaces should target WCAG AA.

Requirements:

- Keyboard-accessible controls
- Visible focus states
- Semantic HTML
- Accessible names for icon buttons
- Sufficient contrast
- Reduced-motion support
- Non-color status indicators
- Screen-reader summaries for complex diagrams
- Minimum 44px interactive target where practical
- Logical tab order
- Architecture content available in a structured textual form

## 21. Product consistency

The same canonical architecture should be reusable across:

- Hero demonstrations
- Architecture generation
- Audit overlays
- Simulation
- Current/recommended comparison
- Monitoring
- Export
- Share pages

Do not create disconnected architecture illustrations for every section.

The product should feel like one system evolving through different states.

## 22. Implementation principle

The design system should be expressed through semantic components and tokens rather than copied class strings.

Core primitives include:

- Button
- ArchitectureNode
- ArchitectureEdge
- ArchitectureGroup
- CanvasToolbar
- StatusBadge
- FindingPanel
- MetricOverlay
- SimulationControl
- TerminalBlock
- ThemeToggle
- DiffControl
- EvidencePanel

The design reference establishes visual intent. Production implementation must preserve accessibility, responsiveness, maintainability and performance.