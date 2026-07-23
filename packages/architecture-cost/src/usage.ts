import { z } from "zod";

export const UsageSourceSchema = z.enum([
  "user-supplied",
  "architecture-assumption",
  "runtime-measured",
  "iac-derived",
  "cloud-discovered",
  "product-default",
  "scenario-derived",
]);
export type UsageSource = z.infer<typeof UsageSourceSchema>;

export const UsageUnitSchema = z.enum([
  "requests-per-month",
  "instance-hours",
  "gb-month",
  "gb-egress",
  "log-gb-ingested",
]);
export type UsageUnit = z.infer<typeof UsageUnitSchema>;

export const UsageDriverSchema = z.object({
  id: z.string().min(1),
  componentId: z.string().min(1),
  unit: UsageUnitSchema,
  value: z.number().nonnegative(),
  source: UsageSourceSchema,
  timeWindow: z.literal("monthly"),
  confidence: z.enum(["confirmed", "high", "medium", "low", "unresolved"]),
  derivation: z.string().min(1),
  userOverride: z.boolean().default(false),
  observedAt: z.iso.datetime().optional(),
});
export type UsageDriver = z.infer<typeof UsageDriverSchema>;

export interface UsageProfile {
  drivers: UsageDriver[];
}

export function validateUsageDriver(driver: UsageDriver): UsageDriver {
  return UsageDriverSchema.parse(driver);
}

export function findUsageDriver(
  profile: UsageProfile,
  componentId: string,
  unit: UsageUnit,
): UsageDriver | null {
  return (
    profile.drivers.find((driver) => driver.componentId === componentId && driver.unit === unit) ??
    null
  );
}
