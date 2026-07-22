---
name: Spatial Architecture
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#4c4546'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#0042c7'
  on-secondary: '#ffffff'
  secondary-container: '#0056fd'
  on-secondary-container: '#e4e7ff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#3a0b00'
  on-tertiary-container: '#ef4800'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#dce1ff'
  secondary-fixed-dim: '#b6c4ff'
  on-secondary-fixed: '#001550'
  on-secondary-fixed-variant: '#003ab2'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59e'
  on-tertiary-fixed: '#3a0b00'
  on-tertiary-fixed-variant: '#852400'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 72px
    fontWeight: '700'
    lineHeight: 72px
    letterSpacing: -0.04em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.01em
  body-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Geist
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
spacing:
  unit: 8px
  grid-col: 1fr
  gutter: 1px
  margin-safe: 40px
  canvas-padding: 64px
---

## Brand & Style

This design system is rooted in the aesthetics of technical drafting and architectural schematics. It treats the UI not as a series of stacked containers, but as an experimental canvas where information is mapped spatially. The target audience includes architects, systems engineers, and creative technologists who value structural transparency and "under-the-hood" precision.

The design style is a hybrid of **Minimalism** and **Technical Brutalism**. It utilizes heavy whitespace to provide breathing room for complex "nodes" of information. Visible structural grid lines and axis markers create an environment that feels like a live CAD document—raw, intentional, and intellectually stimulating. The emotional response is one of clarity, focused complexity, and clinical sophistication.

## Colors

The palette is dominated by a high-contrast foundation to maintain the drafting-paper feel. 
- **Primary (Black):** Used for all structural linework, borders, and primary data points.
- **Secondary (Blueprint Blue):** Reserved for active nodes, connection paths, and interactive states, mimicking a digital blueprint.
- **Tertiary (Warning Orange):** Used sparingly for alerts, critical intersections, or "live" data pulses.
- **Neutral (Architectural Gray/White):** Backgrounds utilize a slightly warm off-white (#F9F9F9) to reduce eye strain, while light grays define the background grid system.

The "Spatial Architecture" relies more on the weight and frequency of lines than on color fills.

## Typography

Typography functions as a structural element. **Space Grotesk** provides a futuristic, geometric weight for primary headings and large-scale spatial labels. **JetBrains Mono** is the workhorse for body copy and technical data, reinforcing the "functional code" aesthetic. **Geist** handles utility labels and metadata, providing a clean, technical contrast.

Large display type should often be placed at the intersections of grid lines or rotated 90 degrees to act as axis markers. Line heights are kept tight to maintain a dense, mapped feel.

## Layout & Spacing

The layout utilizes an **Experimental Canvas Grid**. While it follows a 12-column logic for alignment, components are placed asymmetrically to create a sense of "engineered tension." 

- **Structural Grid:** A visible 1px light gray grid (#EEEEEE) is overlaid across the entire viewport. 
- **Asymmetry:** Content should rarely be centered. Align elements to the far left or far right margins, leaving large "voids" in the center for connection lines.
- **Breakpoints:** 
  - **Desktop (1440px+):** Full spatial spread; elements can float freely across the canvas.
  - **Tablet (768px - 1024px):** Components snap to a 6-column grid; connection lines become simplified vertical/horizontal paths.
  - **Mobile (Under 768px):** Vertical stack; grid lines remain visible but the layout becomes a single column to ensure legibility.

## Elevation & Depth

This design system rejects traditional shadows. Depth is conveyed through **Structural Overlays** and **Z-axis Linework**:

- **Tonal Layers:** Backgrounds use subtle shifts in gray (#F4F4F4 to #FFFFFF) to denote different functional zones.
- **Wireframes:** Instead of shadows, use 1px borders to define containers. When an element is "elevated," increase the border weight from 1px to 2px or add a secondary "ghost" border offset by 4px.
- **Connection Lines:** SVG paths draw connections between nodes. Active connections use the Secondary Blue; inactive connections are faint gray.
- **Crosshairs:** Use small "plus" markers (+) at the corners of active components to indicate their coordinates on the canvas.

## Shapes

The shape language is strictly **Sharp (0px)**. Roundness contradicts the architectural precision of the system. 

- **Containers:** Perfect rectangles and squares defined by 1px black or gray lines.
- **Nodes:** Small solid squares or empty diamonds used at line intersections.
- **In-fills:** Use 45-degree diagonal hatching patterns for "filled" areas or disabled states, rather than solid color fills, to maintain the drafting feel.

## Components

- **Buttons:** Rectangular with 1px borders. Label in `label-caps`. Hover state triggers a solid Primary Black fill with white text and a 2px offset "shadow" box made only of lines.
- **Architecture Nodes:** Small blocks of data (e.g., "Node: 04") framed in a box. An SVG line should physically connect the node to its parent or related copy.
- **Input Fields:** A single bottom border line. The label sits above in `mono-data`. Active state turns the line Secondary Blue with a small blinking "coordinate" cursor.
- **Lists:** Data is presented in a tabular format with visible vertical and horizontal dividers. Every 5th row is slightly darker to aid eye tracking.
- **Cards (Modules):** These are not "cards" in the traditional sense, but "modules." They lack background fills and are defined by their corner brackets ([ ]) or a complete 1px perimeter.
- **Structural Markers:** Non-functional decorative elements like "LAT/LONG" coordinates, scale bars, and version stamps in the viewport corners to enhance the architectural narrative.