import { buttonClasses } from "@axon/ui";
import Link from "next/link";

export function FinalCta() {
  return (
    <section
      aria-labelledby="final-cta-heading"
      className="border-t border-border px-5 py-16 md:px-8 lg:px-16 lg:py-24"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-6">
        <h2 id="final-cta-heading" className="type-headline-lg max-w-2xl text-balance">
          Ready to evolve your system?
        </h2>
        <p className="type-body-lg max-w-xl text-foreground-muted">
          Generate an architecture, audit it against reality, and keep it alive as your system
          changes.
        </p>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link href="/projects/new" className={buttonClasses("primary", "lg")}>
            Start Building Free
          </Link>
          <a
            href="#mcp"
            className="type-mono-data text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Run Locally with MCP <span aria-hidden>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
