import { DEMO_ASSUMPTIONS } from "@/data/demo-architecture";

/**
 * Structured architecture inputs parsed from the example prompt — rendered as
 * technical input modules, not marketing cards.
 */
export function ArchitectureAssumptions() {
  return (
    <div>
      <p className="type-mono-data text-accent">STRUCTURED_INPUTS</p>
      <dl className="mt-3 grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-3">
        {DEMO_ASSUMPTIONS.map((assumption) => (
          <div key={assumption.id} className="bg-surface p-3">
            <dt className="type-label-caps text-foreground-muted">{assumption.label}</dt>
            <dd className="type-mono-data mt-1 text-foreground">{assumption.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
