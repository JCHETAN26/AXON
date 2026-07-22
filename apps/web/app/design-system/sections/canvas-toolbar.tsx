import { CanvasToolbar, CanvasToolbarButton, CanvasToolbarSeparator } from "@axon/ui";

import { DualTheme, Section } from "./section";

function GlyphIcon({ path }: { path: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

export function CanvasToolbarSection() {
  return (
    <Section
      title="CanvasToolbar"
      description="Floating canvas controls with toolbar semantics. Arrow keys, Home and End move focus between enabled buttons."
    >
      <DualTheme>
        <div className="bg-canvas-grid border border-border p-8">
          <CanvasToolbar label="Canvas controls">
            <CanvasToolbarButton label="Zoom in">
              <GlyphIcon path="M8 3v10M3 8h10" />
            </CanvasToolbarButton>
            <CanvasToolbarButton label="Zoom out">
              <GlyphIcon path="M3 8h10" />
            </CanvasToolbarButton>
            <CanvasToolbarButton label="Fit to view">
              <GlyphIcon path="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
            </CanvasToolbarButton>
            <CanvasToolbarSeparator />
            <CanvasToolbarButton label="Toggle grid">
              <GlyphIcon path="M2 6h12M2 10h12M6 2v12M10 2v12" />
            </CanvasToolbarButton>
            <CanvasToolbarButton label="Lock canvas" disabled>
              <GlyphIcon path="M4 7.5h8v6H4zM5.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5" />
            </CanvasToolbarButton>
          </CanvasToolbar>
        </div>
      </DualTheme>
    </Section>
  );
}
