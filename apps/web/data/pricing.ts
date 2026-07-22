/**
 * Planned beta pricing. Provisional — presented as a preview, never as a
 * permanent contractual offer. Every feature carries a typed availability
 * status so the interface can label beta, preview, and planned capabilities
 * honestly.
 */

export type FeatureAvailability = "available" | "beta" | "product-preview" | "planned";

export const AVAILABILITY_LABEL: Record<FeatureAvailability, string> = {
  available: "Available",
  beta: "Beta",
  "product-preview": "Product preview",
  planned: "Planned",
};

export interface PricingFeature {
  label: string;
  availability: FeatureAvailability;
}

export interface PricingTier {
  id: "free" | "builder" | "pro";
  name: string;
  priceMonthly: number;
  description: string;
  features: readonly PricingFeature[];
  ctaLabel: string;
  /** Design emphasis only — not a claim about customer choice. */
  emphasized?: boolean;
  emphasisLabel?: string;
  /** Tier-level availability note, e.g. "Beta". */
  availabilityNote?: string;
}

export const PRICING_TIERS: readonly PricingTier[] = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    description: "For understanding and validating your first architecture.",
    features: [
      { label: "Five AI architecture generations", availability: "available" },
      { label: "One active project", availability: "available" },
      { label: "Editable architecture canvas", availability: "available" },
      { label: "Basic architecture audit", availability: "available" },
      { label: "Local MCP basics", availability: "beta" },
      { label: "SVG and PNG export", availability: "available" },
    ],
    ctaLabel: "Start Building Free",
    availabilityNote: "Beta",
  },
  {
    id: "builder",
    name: "Builder",
    priceMonthly: 15,
    description: "For developers and small teams actively evolving production systems.",
    features: [
      { label: "Private projects", availability: "available" },
      { label: "Repository and infrastructure imports", availability: "beta" },
      { label: "Advanced architecture audits", availability: "available" },
      { label: "Traffic and failure simulations", availability: "beta" },
      { label: "Architecture version history", availability: "available" },
      { label: "Current / Recommended / Diff", availability: "available" },
      { label: "Bring-your-own-model support", availability: "planned" },
    ],
    ctaLabel: "Choose Builder",
    emphasized: true,
    emphasisLabel: "Recommended for beta",
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 24,
    description:
      "For teams that want architecture continuously connected to delivery and runtime signals.",
    features: [
      { label: "Continuous architecture synchronization", availability: "planned" },
      { label: "Advanced multi-scenario simulations", availability: "beta" },
      { label: "Monitoring integrations", availability: "product-preview" },
      { label: "GitHub architecture workflows", availability: "planned" },
      { label: "Architecture drift alerts", availability: "planned" },
      { label: "Higher project and generation limits", availability: "available" },
    ],
    ctaLabel: "Choose Pro",
  },
];
