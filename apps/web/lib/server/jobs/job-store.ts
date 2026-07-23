import { eq, sql } from "drizzle-orm";

import { type Database } from "../db/client";
import { backgroundJobs } from "../db/schema";

export type Job = typeof backgroundJobs.$inferSelect;

const DEFAULT_LEASE_MS = 60_000;

export interface EnqueueInput {
  ownerId: string | null;
  kind: string;
  /** Duplicate enqueues with the same key are ignored (idempotent). */
  idempotencyKey: string;
  payload: unknown;
  maxAttempts?: number;
}

/** Sanitizes an error to a short, safe message (never a stack or payload). */
function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : "unknown error";
  return message.slice(0, 300);
}

/**
 * Enqueues a job idempotently. If a job with the same `idempotencyKey` already
 * exists, no new job is created (duplicate webhook deliveries never duplicate
 * work). Returns the job id (new or existing).
 */
export async function enqueueJob(db: Database, input: EnqueueInput): Promise<string> {
  const inserted = await db
    .insert(backgroundJobs)
    .values({
      ownerId: input.ownerId,
      kind: input.kind,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
      ...(input.maxAttempts !== undefined && { maxAttempts: input.maxAttempts }),
    })
    .onConflictDoNothing({ target: backgroundJobs.idempotencyKey })
    .returning({ id: backgroundJobs.id });

  const created = inserted[0]?.id;
  if (created !== undefined) return created;

  // Already enqueued — return the existing job id.
  const existing = await db
    .select({ id: backgroundJobs.id })
    .from(backgroundJobs)
    .where(eq(backgroundJobs.idempotencyKey, input.idempotencyKey))
    .limit(1);
  const id = existing[0]?.id;
  if (id === undefined) throw new Error("Failed to enqueue job.");
  return id;
}

/**
 * Atomically claims the oldest runnable job (pending, or a leased job whose
 * lease expired), leasing it and incrementing its attempt count. Returns null
 * when nothing is runnable.
 */
export async function claimNextJob(
  db: Database,
  opts: { now?: Date; leaseMs?: number } = {},
): Promise<Job | null> {
  const now = opts.now ?? new Date();
  const leaseUntil = new Date(now.getTime() + (opts.leaseMs ?? DEFAULT_LEASE_MS));

  // Atomic claim: a single UPDATE guarded by a locked subquery. `returning id`
  // yields a raw (snake_case) row, so we re-read through Drizzle for typing.
  const result = await db.execute(sql`
    update background_jobs set
      status = 'leased',
      attempts = attempts + 1,
      lease_expires_at = ${leaseUntil},
      updated_at = ${now}
    where id = (
      select id from background_jobs
      where status = 'pending'
         or (status = 'leased' and lease_expires_at <= ${now})
      order by created_at asc
      limit 1
      for update skip locked
    )
    returning id
  `);
  const raw = (result as unknown as { rows?: { id: string }[] }).rows ?? (result as unknown as { id: string }[]);
  const claimedId = Array.isArray(raw) ? raw[0]?.id : undefined;
  if (claimedId === undefined) return null;
  return getJob(db, String(claimedId));
}

export async function completeJob(db: Database, jobId: string, now = new Date()): Promise<void> {
  await db
    .update(backgroundJobs)
    .set({ status: "succeeded", progress: 100, updatedAt: now })
    .where(eq(backgroundJobs.id, jobId));
}

/**
 * Fails a job: retried (back to pending) until `maxAttempts` is reached, then
 * moved to the dead-letter state. The error is sanitized before storage.
 */
export async function failJob(
  db: Database,
  job: Job,
  error: unknown,
  now = new Date(),
): Promise<"retry" | "dead"> {
  const dead = job.attempts >= job.maxAttempts;
  await db
    .update(backgroundJobs)
    .set({
      status: dead ? "dead" : "pending",
      lastError: safeError(error),
      leaseExpiresAt: null,
      updatedAt: now,
    })
    .where(eq(backgroundJobs.id, job.id));
  return dead ? "dead" : "retry";
}

export async function getJob(db: Database, jobId: string): Promise<Job | null> {
  const rows = await db.select().from(backgroundJobs).where(eq(backgroundJobs.id, jobId)).limit(1);
  return rows[0] ?? null;
}

/**
 * Runs a single job through a handler, completing or failing it. Returns the
 * outcome, or null when there was nothing to run.
 */
export async function runNextJob(
  db: Database,
  handler: (job: Job) => Promise<void>,
  opts: { now?: Date; leaseMs?: number } = {},
): Promise<"succeeded" | "retry" | "dead" | null> {
  const job = await claimNextJob(db, opts);
  if (job === null) return null;
  try {
    await handler(job);
    await completeJob(db, job.id, opts.now);
    return "succeeded";
  } catch (error) {
    return failJob(db, job, error, opts.now);
  }
}
