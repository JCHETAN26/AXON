import { ThemeToggle } from "@axon/ui";
import { type Metadata } from "next";
import { notFound } from "next/navigation";

import { ArchitectureNodesSection } from "./sections/architecture-nodes";
import { ButtonsSection } from "./sections/buttons";
import { CanvasToolbarSection } from "./sections/canvas-toolbar";
import { ColorTokensSection } from "./sections/color-tokens";
import { StatusBadgesSection } from "./sections/status-badges";
import { TerminalBlockSection } from "./sections/terminal-block";
import { ThemeSection } from "./sections/theme";
import { TypographySection } from "./sections/typography";

export const metadata: Metadata = {
  title: "Design System",
  robots: { index: false },
};

/**
 * Development-only review surface for the Spatial Architecture design system.
 * Not part of the product and excluded from production builds.
 */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pt-16 pb-24 md:px-8 lg:px-16">
      <header className="flex flex-wrap items-end justify-between gap-6 border-b-2 border-foreground pb-8">
        <div>
          <p className="type-label-caps text-accent">Internal · Development only</p>
          <h1 className="type-headline-lg mt-3">Design System</h1>
          <p className="type-body-md mt-3 max-w-xl text-foreground-muted">
            Spatial Architecture v1.0 — every UI primitive and its important states, reviewed in
            light and dark themes.
          </p>
        </div>
        <ThemeToggle />
      </header>
      <ColorTokensSection />
      <TypographySection />
      <ButtonsSection />
      <StatusBadgesSection />
      <ArchitectureNodesSection />
      <CanvasToolbarSection />
      <TerminalBlockSection />
      <ThemeSection />
    </main>
  );
}
