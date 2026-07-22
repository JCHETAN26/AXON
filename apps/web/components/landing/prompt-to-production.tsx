import { ArchitectureAssumptions } from "./architecture-assumptions";
import { ArchitectureGenerationDemo } from "./architecture-generation-demo";
import { DEMO_PROMPT } from "@/data/demo-architecture";

export function PromptToProduction() {
  return (
    <section
      id="prompt-to-production"
      aria-labelledby="prompt-heading"
      className="border-t border-border px-5 py-16 md:px-8 lg:px-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <h2 id="prompt-heading" className="type-headline-lg max-w-2xl text-balance">
          Prompt to Production.
        </h2>
        <p className="type-body-lg mt-4 max-w-2xl text-foreground-muted">
          Describe the system you want to build. AXON turns your requirements into a structured,
          editable architecture with explicit assumptions and tradeoffs.
        </p>
        <div className="mt-12 grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col gap-8">
            <div className="border-2 border-border-strong bg-surface p-6">
              <p className="type-mono-data text-accent">USER_PROMPT</p>
              <p className="type-body-lg mt-3">“{DEMO_PROMPT}”</p>
            </div>
            <ArchitectureAssumptions />
          </div>
          <div className="flex flex-col gap-4">
            <ArchitectureGenerationDemo />
            <p className="type-label-caps text-foreground">
              AI-generated. Structurally validated. Fully editable.
            </p>
            <p className="type-mono-data text-foreground-muted">
              Interactive product preview — not connected to a live model.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
