import { z } from "zod";

export const COST_MODEL_VERSION = "0.1.0";
export const TEST_CATALOG_VERSION = "2026.07.test";
export const TEST_CATALOG_EFFECTIVE_DATE = "2026-07-01";

export const ProviderSchema = z.enum(["aws", "gcp", "azure"]);
export type Provider = z.infer<typeof ProviderSchema>;

export const CurrencySchema = z.enum(["USD"]);
export type Currency = z.infer<typeof CurrencySchema>;

export const PricingUnitSchema = z.enum([
  "instance-hour",
  "gb-month",
  "million-requests",
  "gb-egress",
  "gb-ingested",
]);
export type PricingUnit = z.infer<typeof PricingUnitSchema>;

export const PricingRecordSchema = z.object({
  provider: ProviderSchema,
  serviceId: z.string().min(1),
  sku: z.string().min(1),
  region: z.string().min(1),
  currency: CurrencySchema,
  unit: PricingUnitSchema,
  unitPrice: z.number().nonnegative(),
  freeTierQuantity: z.number().nonnegative().optional().default(0),
  effectiveDate: z.iso.date(),
  sourceReference: z.string().min(1),
  retrievedAt: z.iso.datetime(),
  catalogVersion: z.string().min(1),
  validationStatus: z.enum(["test-fixture", "validated", "stale"]),
  deprecated: z.boolean().default(false),
});
export type PricingRecord = z.infer<typeof PricingRecordSchema>;

export const PricingCatalogSchema = z.object({
  version: z.string().min(1),
  effectiveDate: z.iso.date(),
  retrievedAt: z.iso.datetime(),
  records: z.array(PricingRecordSchema).min(1),
});
export type PricingCatalog = z.infer<typeof PricingCatalogSchema>;

export function validatePricingCatalog(catalog: PricingCatalog): PricingCatalog {
  return PricingCatalogSchema.parse(catalog);
}

export function findPricingRecord(
  catalog: PricingCatalog,
  input: {
    provider: Provider;
    serviceId: string;
    region: string;
    unit: PricingUnit;
  },
): PricingRecord | null {
  const exact = catalog.records.find(
    (record) =>
      record.provider === input.provider &&
      record.serviceId === input.serviceId &&
      record.region === input.region &&
      record.unit === input.unit &&
      !record.deprecated,
  );
  if (exact) return exact;

  return (
    catalog.records.find(
      (record) =>
        record.provider === input.provider &&
        record.serviceId === input.serviceId &&
        record.region === "global" &&
        record.unit === input.unit &&
        !record.deprecated,
    ) ?? null
  );
}

const retrievedAt = "2026-07-01T00:00:00.000Z";

function record(input: {
  provider: Provider;
  serviceId: string;
  sku: string;
  region: string;
  unit: PricingUnit;
  unitPrice: number;
  freeTierQuantity?: number;
}): PricingRecord {
  return {
    provider: input.provider,
    serviceId: input.serviceId,
    sku: input.sku,
    region: input.region,
    currency: "USD",
    unit: input.unit,
    unitPrice: input.unitPrice,
    freeTierQuantity: input.freeTierQuantity ?? 0,
    effectiveDate: TEST_CATALOG_EFFECTIVE_DATE,
    sourceReference: "offline-test-catalog",
    retrievedAt,
    catalogVersion: TEST_CATALOG_VERSION,
    validationStatus: "test-fixture",
    deprecated: false,
  };
}

export const TEST_PRICING_CATALOG: PricingCatalog = validatePricingCatalog({
  version: TEST_CATALOG_VERSION,
  effectiveDate: TEST_CATALOG_EFFECTIVE_DATE,
  retrievedAt,
  records: [
    record({
      provider: "aws",
      serviceId: "compute",
      sku: "test-aws-compute-instance-hour",
      region: "us-east-1",
      unit: "instance-hour",
      unitPrice: 0.05,
    }),
    record({
      provider: "aws",
      serviceId: "database",
      sku: "test-aws-database-instance-hour",
      region: "us-east-1",
      unit: "instance-hour",
      unitPrice: 0.18,
    }),
    record({
      provider: "aws",
      serviceId: "storage",
      sku: "test-aws-storage-gb-month",
      region: "global",
      unit: "gb-month",
      unitPrice: 0.023,
    }),
    record({
      provider: "aws",
      serviceId: "queue",
      sku: "test-aws-queue-million-requests",
      region: "global",
      unit: "million-requests",
      unitPrice: 0.4,
      freeTierQuantity: 1_000_000,
    }),
    record({
      provider: "aws",
      serviceId: "network-egress",
      sku: "test-aws-egress-gb",
      region: "global",
      unit: "gb-egress",
      unitPrice: 0.09,
    }),
    record({
      provider: "gcp",
      serviceId: "compute",
      sku: "test-gcp-compute-instance-hour",
      region: "us-central1",
      unit: "instance-hour",
      unitPrice: 0.047,
    }),
    record({
      provider: "gcp",
      serviceId: "database",
      sku: "test-gcp-database-instance-hour",
      region: "us-central1",
      unit: "instance-hour",
      unitPrice: 0.16,
    }),
    record({
      provider: "gcp",
      serviceId: "storage",
      sku: "test-gcp-storage-gb-month",
      region: "global",
      unit: "gb-month",
      unitPrice: 0.026,
    }),
    record({
      provider: "gcp",
      serviceId: "queue",
      sku: "test-gcp-pubsub-million-requests",
      region: "global",
      unit: "million-requests",
      unitPrice: 0.45,
      freeTierQuantity: 1_000_000,
    }),
    record({
      provider: "gcp",
      serviceId: "network-egress",
      sku: "test-gcp-egress-gb",
      region: "global",
      unit: "gb-egress",
      unitPrice: 0.085,
    }),
    record({
      provider: "azure",
      serviceId: "compute",
      sku: "test-azure-compute-instance-hour",
      region: "eastus",
      unit: "instance-hour",
      unitPrice: 0.052,
    }),
    record({
      provider: "azure",
      serviceId: "database",
      sku: "test-azure-database-instance-hour",
      region: "eastus",
      unit: "instance-hour",
      unitPrice: 0.17,
    }),
    record({
      provider: "azure",
      serviceId: "storage",
      sku: "test-azure-storage-gb-month",
      region: "global",
      unit: "gb-month",
      unitPrice: 0.021,
    }),
    record({
      provider: "azure",
      serviceId: "queue",
      sku: "test-azure-queue-million-requests",
      region: "global",
      unit: "million-requests",
      unitPrice: 0.36,
      freeTierQuantity: 1_000_000,
    }),
    record({
      provider: "azure",
      serviceId: "network-egress",
      sku: "test-azure-egress-gb",
      region: "global",
      unit: "gb-egress",
      unitPrice: 0.087,
    }),
  ],
});
