import { PricingTierCard } from "./pricing-tier-card";
import { PRICING_TIERS } from "@/data/pricing";

export function PricingSection() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="scroll-mt-14 border-t border-border px-5 py-16 md:px-8 lg:px-16 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <h2 id="pricing-heading" className="type-headline-lg max-w-3xl text-balance">
          Start free. Upgrade when the architecture becomes part of your workflow.
        </h2>
        <p className="type-body-lg mt-4 max-w-2xl text-foreground-muted">
          Explore AXON with a real project, then unlock deeper audits, simulations, history, and
          synchronization as your system grows.
        </p>
        <p className="type-label-caps mt-3 text-accent">Planned beta pricing</p>
        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
          {PRICING_TIERS.map((tier) => (
            <PricingTierCard key={tier.id} tier={tier} />
          ))}
        </div>
        <p className="type-mono-data mt-6 text-foreground-muted">
          Pricing is provisional during beta and may change before general availability.
        </p>
      </div>
    </section>
  );
}
