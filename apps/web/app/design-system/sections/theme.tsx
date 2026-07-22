import { ThemeToggle } from "@axon/ui";

import { Section } from "./section";

export function ThemeSection() {
  return (
    <Section
      title="ThemeToggle"
      description="Persisted light / dark / system selection with radio-group semantics. The choice applies globally to this page and survives reloads without flashing."
    >
      <div className="flex items-center gap-6 border border-border p-6">
        <ThemeToggle />
        <p className="type-body-md text-foreground-muted">
          Switch themes to review the page-level state; the panels above always show both themes
          side by side.
        </p>
      </div>
    </Section>
  );
}
