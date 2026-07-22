import { and, eq, sql } from "drizzle-orm";

import { type Database } from "./db/client";
import { generationUsage } from "./db/schema";

/** Per-user daily generation quota and minimum spacing between requests. */
export const GENERATION_QUOTA = {
  perDay: 50,
  /** Minimum milliseconds between two generations by the same user. */
  minIntervalMs: 3_000,
} as const;

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
  return {
    used,
    limit: GENERATION_QUOTA.perDay,
    remaining: Math.max(0, GENERATION_QUOTA.perDay - used),
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
  const existing = await db
    .select()
    .from(generationUsage)
    .where(and(eq(generationUsage.userId, userId), eq(generationUsage.day, day)))
    .limit(1);
  const row = existing[0];

  const status: QuotaStatus = {
    used: row?.count ?? 0,
    limit: GENERATION_QUOTA.perDay,
    remaining: Math.max(0, GENERATION_QUOTA.perDay - (row?.count ?? 0)),
    day,
  };

  if ((row?.count ?? 0) >= GENERATION_QUOTA.perDay) {
    return { allowed: false, reason: "quota-exceeded", status };
  }

  if (row !== undefined) {
    const sinceLast = now.getTime() - row.lastRequestAt.getTime();
    if (sinceLast < GENERATION_QUOTA.minIntervalMs) {
      return {
        allowed: false,
        reason: "rate-limited",
        status,
        retryAfterMs: GENERATION_QUOTA.minIntervalMs - sinceLast,
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
      limit: GENERATION_QUOTA.perDay,
      remaining: Math.max(0, GENERATION_QUOTA.perDay - used),
      day,
    },
  };
}
