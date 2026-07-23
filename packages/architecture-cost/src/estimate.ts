import { type ArchitectureDocument, type ArchitectureNodeModel } from "@axon/diagram-schema";

import {
  COST_MODEL_VERSION,
  findPricingRecord,
  TEST_PRICING_CATALOG,
  type Currency,
  type PricingCatalog,
  type PricingRecord,
  type Provider,
} from "./catalog";
import { findUsageDriver, type UsageDriver, type UsageProfile } from "./usage";

export interface CostEstimateInput {
  document: ArchitectureDocument;
  provider: Provider;
  region: string;
  currency?: Currency;
  usageProfile: UsageProfile;
  catalog?: PricingCatalog;
}

export interface CostLineItem {
  componentId: string;
  componentName: string;
  category: string;
  provider: Provider;
  region: string;
  currency: Currency;
  usageUnit: string;
  usageValue: number | null;
  pricingRecord: PricingRecord | null;
  lowMonthly: number;
  expectedMonthly: number;
  highMonthly: number;
  confidence: "confirmed" | "high" | "medium" | "low" | "unresolved";
  costDriver: string;
  missingInputs: string[];
  limitations: string[];
}

export interface CostEstimate {
  modelVersion: string;
  provider: Provider;
  region: string;
  currency: Currency;
  pricingCatalogVersion: string;
  pricingEffectiveDate: string;
  lowMonthly: number;
  expectedMonthly: number;
  highMonthly: number;
  lineItems: CostLineItem[];
  majorCostDrivers: string[];
  missingInputs: string[];
  confidence: "confirmed" | "high" | "medium" | "low" | "unresolved";
  limitations: string[];
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function serviceFor(node: ArchitectureNodeModel): {
  serviceId: string;
  usageUnit: "instance-hours" | "gb-month" | "requests-per-month" | "gb-egress";
  pricingUnit: "instance-hour" | "gb-month" | "million-requests" | "gb-egress";
  fixed?: boolean;
} | null {
  const key = `${node.meta ?? ""} ${node.category}`.toLowerCase();
  if (key.includes("database") || key.includes("rds") || key.includes("sql")) {
    return {
      serviceId: "database",
      usageUnit: "instance-hours",
      pricingUnit: "instance-hour",
      fixed: true,
    };
  }
  if (
    key.includes("queue") ||
    key.includes("broker") ||
    key.includes("rabbitmq") ||
    key.includes("sqs") ||
    key.includes("pubsub")
  ) {
    return { serviceId: "queue", usageUnit: "requests-per-month", pricingUnit: "million-requests" };
  }
  if (key.includes("storage") || key.includes("bucket") || key.includes("s3")) {
    return { serviceId: "storage", usageUnit: "gb-month", pricingUnit: "gb-month" };
  }
  if (key.includes("egress") || key.includes("cdn")) {
    return { serviceId: "network-egress", usageUnit: "gb-egress", pricingUnit: "gb-egress" };
  }
  if (key.includes("compute") || key.includes("service") || key.includes("instance")) {
    return { serviceId: "compute", usageUnit: "instance-hours", pricingUnit: "instance-hour" };
  }
  return null;
}

function confidenceFor(
  driver: UsageDriver | null,
  pricing: PricingRecord | null,
): CostLineItem["confidence"] {
  if (!driver || !pricing) return "low";
  if (driver.confidence === "confirmed" && pricing.validationStatus === "validated")
    return "confirmed";
  if (driver.confidence === "high") return "high";
  if (driver.confidence === "medium") return "medium";
  return "low";
}

function uncertainty(confidence: CostLineItem["confidence"]): number {
  if (confidence === "confirmed") return 0.05;
  if (confidence === "high") return 0.15;
  if (confidence === "medium") return 0.3;
  return 0.5;
}

function computeLineItem(
  node: ArchitectureNodeModel,
  input: Required<
    Pick<CostEstimateInput, "provider" | "region" | "currency" | "usageProfile" | "catalog">
  >,
): CostLineItem {
  const service = serviceFor(node);
  if (!service) {
    return {
      componentId: node.id,
      componentName: node.name,
      category: node.category,
      provider: input.provider,
      region: input.region,
      currency: input.currency,
      usageUnit: "unsupported",
      usageValue: null,
      pricingRecord: null,
      lowMonthly: 0,
      expectedMonthly: 0,
      highMonthly: 0,
      confidence: "low",
      costDriver: "Unsupported service requires manual input.",
      missingInputs: ["supported cost model"],
      limitations: ["Unsupported services are excluded from totals and are not treated as free."],
    };
  }

  const driver = findUsageDriver(input.usageProfile, node.id, service.usageUnit);
  const pricing = findPricingRecord(input.catalog, {
    provider: input.provider,
    serviceId: service.serviceId,
    region: input.region,
    unit: service.pricingUnit,
  });
  const missingInputs = [
    ...(driver ? [] : [`${service.usageUnit} usage`]),
    ...(pricing ? [] : [`${service.serviceId} ${service.pricingUnit} pricing`]),
  ];
  const usageValue = driver?.value ?? null;
  const billableQuantity =
    usageValue === null ? 0 : Math.max(0, usageValue - (pricing?.freeTierQuantity ?? 0));
  const normalizedQuantity =
    service.pricingUnit === "million-requests" ? billableQuantity / 1_000_000 : billableQuantity;
  const expected = pricing ? normalizedQuantity * pricing.unitPrice : 0;
  const confidence = confidenceFor(driver, pricing);
  const spread = uncertainty(confidence);

  return {
    componentId: node.id,
    componentName: node.name,
    category: node.category,
    provider: input.provider,
    region: pricing?.region ?? input.region,
    currency: input.currency,
    usageUnit: service.usageUnit,
    usageValue,
    pricingRecord: pricing,
    lowMonthly: roundMoney(expected * (1 - spread)),
    expectedMonthly: roundMoney(expected),
    highMonthly: roundMoney(expected * (1 + spread)),
    confidence,
    costDriver:
      usageValue === null
        ? "Missing usage assumption."
        : `${usageValue} ${service.usageUnit} at ${pricing?.unitPrice ?? 0} ${input.currency}/${service.pricingUnit}`,
    missingInputs,
    limitations: [
      ...(pricing?.validationStatus === "test-fixture"
        ? ["Uses offline deterministic test pricing, not a live provider catalog."]
        : []),
      "Taxes, support plans, enterprise discounts, and reserved-use discounts are not included.",
    ],
  };
}

export function estimateArchitectureCost(input: CostEstimateInput): CostEstimate {
  const catalog = input.catalog ?? TEST_PRICING_CATALOG;
  const currency = input.currency ?? "USD";
  const lineItems = input.document.nodes.map((node) =>
    computeLineItem(node, {
      provider: input.provider,
      region: input.region,
      currency,
      usageProfile: input.usageProfile,
      catalog,
    }),
  );
  const lowMonthly = roundMoney(lineItems.reduce((sum, item) => sum + item.lowMonthly, 0));
  const expectedMonthly = roundMoney(
    lineItems.reduce((sum, item) => sum + item.expectedMonthly, 0),
  );
  const highMonthly = roundMoney(lineItems.reduce((sum, item) => sum + item.highMonthly, 0));
  const missingInputs = [...new Set(lineItems.flatMap((item) => item.missingInputs))];
  const majorCostDrivers = lineItems
    .filter((item) => item.expectedMonthly > 0)
    .sort((a, b) => b.expectedMonthly - a.expectedMonthly)
    .slice(0, 3)
    .map((item) => `${item.componentName}: ${item.costDriver}`);

  return {
    modelVersion: COST_MODEL_VERSION,
    provider: input.provider,
    region: input.region,
    currency,
    pricingCatalogVersion: catalog.version,
    pricingEffectiveDate: catalog.effectiveDate,
    lowMonthly,
    expectedMonthly,
    highMonthly,
    lineItems,
    majorCostDrivers,
    missingInputs,
    confidence: missingInputs.length > 0 ? "low" : "medium",
    limitations: [
      "This is a modeled monthly estimate, not an invoice.",
      "Taxes, support plans, enterprise discounts, reserved-use discounts, and hidden provider fees are not included unless explicitly modeled.",
      "Future pricing may differ from the catalog effective date.",
    ],
  };
}

export const SCALE_FACTORS = [1, 2, 5, 10, 50] as const;
export type ScaleFactor = (typeof SCALE_FACTORS)[number];

export function scaleUsageProfile(profile: UsageProfile, factor: ScaleFactor): UsageProfile {
  return scaleUsageProfileByFactor(profile, factor);
}

export function scaleUsageProfileByFactor(profile: UsageProfile, factor: number): UsageProfile {
  return {
    drivers: profile.drivers.map((driver) => {
      if (driver.unit === "instance-hours") return driver;
      return {
        ...driver,
        value: driver.value * factor,
        source: "scenario-derived",
        derivation: `${driver.derivation}; scaled ${factor}x for scenario projection`,
      };
    }),
  };
}

export function estimateArchitectureCostAtScale(
  input: CostEstimateInput,
): Record<ScaleFactor, CostEstimate> {
  return Object.fromEntries(
    SCALE_FACTORS.map((factor) => [
      factor,
      estimateArchitectureCost({
        ...input,
        usageProfile: scaleUsageProfile(input.usageProfile, factor),
      }),
    ]),
  ) as Record<ScaleFactor, CostEstimate>;
}

export function estimateArchitectureCostAcrossProviders(input: {
  document: ArchitectureDocument;
  usageProfile: UsageProfile;
  providers?: readonly Provider[];
  regions?: Partial<Record<Provider, string>>;
  currency?: Currency;
  catalog?: PricingCatalog;
}): Record<Provider, CostEstimate> {
  const providers = input.providers ?? (["aws", "gcp", "azure"] as const);
  return Object.fromEntries(
    providers.map((provider) => {
      const estimateInput: CostEstimateInput = {
        document: input.document,
        provider,
        region:
          input.regions?.[provider] ??
          (provider === "aws" ? "us-east-1" : provider === "gcp" ? "us-central1" : "eastus"),
        usageProfile: input.usageProfile,
      };
      if (input.currency !== undefined) estimateInput.currency = input.currency;
      if (input.catalog !== undefined) estimateInput.catalog = input.catalog;
      return [provider, estimateArchitectureCost(estimateInput)];
    }),
  ) as Record<Provider, CostEstimate>;
}
