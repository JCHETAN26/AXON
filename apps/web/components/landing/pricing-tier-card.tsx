import { buttonClasses, cx } from "@axon/ui";
import Link from "next/link";

import { AVAILABILITY_LABEL, type PricingTier } from "@/data/pricing";

export function PricingTierCard({ tier }: { tier: PricingTier }) {
  const emphasized = tier.emphasized === true;
  return (
    <div
      className={cx(
        "flex flex-col border-2 bg-surface p-6",
        emphasized
          ? "border-accent shadow-[8px_8px_0_0_var(--color-accent-muted)]"
          : "border-border-strong",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="type-label-caps text-foreground">{tier.name}</h3>
        {emphasized && tier.emphasisLabel !== undefined && (
          <p className="type-label-caps border border-accent bg-accent-muted px-2 py-0.5 text-foreground">
            {tier.emphasisLabel}
          </p>
        )}
        {tier.availabilityNote !== undefined && (
          <p className="type-label-caps border border-border px-2 py-0.5 text-foreground-muted">
            {tier.availabilityNote}
          </p>
        )}
      </div>
      <p className="mt-4">
        <span className="font-display text-5xl font-bold text-foreground">
          ${tier.priceMonthly}
        </span>
        <span className="type-mono-data ml-2 text-foreground-muted">/ month</span>
      </p>
      <p className="type-body-md mt-3 text-foreground-muted">{tier.description}</p>
      <ul className="mt-6 flex flex-1 flex-col gap-2.5">
        {tier.features.map((feature) => (
          <li key={feature.label} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span aria-hidden className="type-mono-data text-foreground-muted">
              ·
            </span>
            <span className="type-mono-data text-foreground">{feature.label}</span>
            {feature.availability !== "available" && (
              <span className="type-label-caps border border-border px-1.5 py-0.5 text-foreground-muted">
                {AVAILABILITY_LABEL[feature.availability]}
              </span>
            )}
          </li>
        ))}
      </ul>
      {tier.id === "free" ? (
        <Link href="/projects/new" className={cx(buttonClasses("secondary", "md"), "mt-8 w-full")}>
          {tier.ctaLabel}
        </Link>
      ) : (
        <a
          href="#sign-up"
          className={cx(buttonClasses(emphasized ? "primary" : "secondary", "md"), "mt-8 w-full")}
        >
          {tier.ctaLabel}
        </a>
      )}
    </div>
  );
}
