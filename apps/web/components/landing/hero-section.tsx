import { buttonClasses } from "@axon/ui";
import Link from "next/link";

import { HeroArchitecture } from "./hero-architecture";

export function HeroSection() {
  return (
    <section
      id="product"
      aria-labelledby="hero-heading"
      className="scroll-mt-14 px-5 pt-14 pb-16 md:px-8 md:pt-20 lg:px-16 lg:pb-24"
    >
      <div className="mx-auto max-w-7xl">
        <p className="type-label-caps text-accent">Generate. Audit. Simulate. Monitor.</p>
        <h1
          id="hero-heading"
          className="type-display-lg-mobile lg:type-display-lg mt-6 max-w-4xl text-balance"
        >
          Design systems that are <span className="text-accent">ready</span> for reality.
        </h1>
        <p className="type-body-lg mt-6 max-w-xl text-foreground-muted">
          The visual infrastructure map that keeps your engineering team in sync. Generate, audit,
          simulate, and evolve complex architectures from one living canvas.
        </p>
        <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          <Link href="/projects/new" className={buttonClasses("primary", "lg")}>
            Build Your First Architecture
          </Link>
          <a href="#demo" className={buttonClasses("secondary", "lg")}>
            View Interactive Demo
          </a>
          <a
            href="#mcp"
            className="type-mono-data text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            Run Locally with MCP <span aria-hidden>→</span>
          </a>
        </div>
      </div>
      <div className="mx-auto mt-16 max-w-7xl lg:mt-20">
        <HeroArchitecture />
      </div>
    </section>
  );
}
