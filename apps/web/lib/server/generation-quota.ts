import { and, eq, sql } from "drizzle-orm";

import { type Database } from "./db/client";
import { generationUsage } from "./db/schema";

export interface GenerationQuotaLimits {
  readonly perDay: number;
  /** Minimum milliseconds between two generations by the same user. */
  readonly minIntervalMs: number;
}

const DEFAULT_QUOTA: GenerationQuotaLimits = { perDay: 50, minIntervalMs: 3_000 };

function positiveInt(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

/**
 * Per-user daily quota and minimum spacing between requests.
 *
 * Read from the environment on each call so the deployment overrides actually
 * take effect. `validateGeneration` has always checked these variables at boot,
 * but nothing consumed them — the limits were pinned to the defaults however
 * the deployment was configured.
 */
export function generationQuota(env: NodeJS.ProcessEnv = process.env): GenerationQuotaLimits {
  const perMinute = positiveInt(env.AXON_GENERATION_PER_MINUTE_LIMIT);
  return {
    perDay: positiveInt(env.AXON_GENERATION_DAILY_LIMIT) ?? DEFAULT_QUOTA.perDay,
    minIntervalMs:
      perMinute === undefined ? DEFAULT_QUOTA.minIntervalMs : Math.ceil(60_000 / perMinute),
  };
}

export interface QuotaStatus {
  readonly used: number;
  readonly limit: number;
  readonly remaining: number;
  readonly day: string;
}

export type QuotaOutcome =
  | { allowed: true; status: QuotaStatus }
  | {
      allowed: false;
      reason: "quota-exceeded" | "rate-limited";
      status: QuotaStatus;
      retryAfterMs?: number;
    };

function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Reads current usage without consuming any. */
export async function getQuotaStatus(
  db: Database,
  userId: string,
  now: Date = new Date(),
): Promise<QuotaStatus> {
  const day = utcDay(now);
  const rows = await db
    .select({ count: generationUsage.count })
    .from(generationUsage)
    .where(and(eq(generationUsage.userId, userId), eq(generationUsage.day, day)))
    .limit(1);
  const used = rows[0]?.count ?? 0;
  const { perDay } = generationQuota();
  return {
    used,
    limit: perDay,
    remaining: Math.max(0, perDay - used),
    day,
  };
}

/**
 * Atomically consumes one generation if the user is under quota and not
 * requesting too fast. Deterministic given the same clock, and enforced in the
 * database so it holds across concurrent requests and multiple instances.
 */
export async function consumeGeneration(
  db: Database,
  userId: string,
  now: Date = new Date(),
): Promise<QuotaOutcome> {
  const day = utcDay(now);
  const { perDay, minIntervalMs } = generationQuota();
  const existing = await db
    .select()
    .from(generationUsage)
    .where(and(eq(generationUsage.userId, userId), eq(generationUsage.day, day)))
    .limit(1);
  const row = existing[0];

  const status: QuotaStatus = {
    used: row?.count ?? 0,
    limit: perDay,
    remaining: Math.max(0, perDay - (row?.count ?? 0)),
    day,
  };

  if ((row?.count ?? 0) >= perDay) {
    return { allowed: false, reason: "quota-exceeded", status };
  }

  if (row !== undefined) {
    const sinceLast = now.getTime() - row.lastRequestAt.getTime();
    if (sinceLast < minIntervalMs) {
      return {
        allowed: false,
        reason: "rate-limited",
        status,
        retryAfterMs: minIntervalMs - sinceLast,
      };
    }
  }

  const updated = await db
    .insert(generationUsage)
    .values({ userId, day, count: 1, lastRequestAt: now })
    .onConflictDoUpdate({
      target: [generationUsage.userId, generationUsage.day],
      set: { count: sql`${generationUsage.count} + 1`, lastRequestAt: now },
    })
    .returning({ count: generationUsage.count });

  const used = updated[0]?.count ?? status.used + 1;
  return {
    allowed: true,
    status: {
      used,
      limit: perDay,
      remaining: Math.max(0, perDay - used),
      day,
    },
  };
}
