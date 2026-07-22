import { safeParseArchitectureDocument, type ArchitectureDocument } from "@axon/diagram-schema";
import { z } from "zod";

/**
 * Session-expiry recovery record. Stored in session storage only so it can
 * survive the sign-in redirect, and deliberately minimal: it holds the unsaved
 * architecture and just enough context to resume safely. It never contains
 * provider tokens, invite codes, Compose YAML, imported secrets, feedback, or
 * unrelated project data.
 */
const RECOVERY_KEY = "axon.session-recovery.v1";

/** Recovery records older than this are ignored and cleared. */
export const RECOVERY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const RecoveryRecordSchema = z.object({
  projectId: z.string().min(1),
  expectedRevision: z.number().int().nonnegative().nullable(),
  document: z.unknown(),
  safeRoute: z.string().startsWith("/"),
  recordedAt: z.string(),
});

export interface RecoveryRecord {
  readonly projectId: string;
  readonly expectedRevision: number | null;
  readonly document: ArchitectureDocument;
  readonly safeRoute: string;
  readonly recordedAt: string;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function isSafeRoute(route: string): boolean {
  return route.startsWith("/") && !route.startsWith("//") && !route.includes("\\");
}

export interface SaveRecoveryInput {
  projectId: string;
  expectedRevision: number | null;
  document: ArchitectureDocument;
  safeRoute: string;
  now?: Date;
}

/** Persists a recovery record. Refuses unsafe routes and invalid documents. */
export function saveRecoveryRecord(input: SaveRecoveryInput): boolean {
  const store = storage();
  if (store === null) return false;
  if (!isSafeRoute(input.safeRoute)) return false;
  const validated = safeParseArchitectureDocument(input.document);
  if (!validated.success) return false;

  const record = {
    projectId: input.projectId,
    expectedRevision: input.expectedRevision,
    document: validated.data,
    safeRoute: input.safeRoute,
    recordedAt: (input.now ?? new Date()).toISOString(),
  };
  try {
    store.setItem(RECOVERY_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

/** Loads a valid, non-expired recovery record, or null. Clears invalid/expired. */
export function loadRecoveryRecord(now: Date = new Date()): RecoveryRecord | null {
  const store = storage();
  if (store === null) return null;
  const raw = store.getItem(RECOVERY_KEY);
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearRecoveryRecord();
    return null;
  }
  const result = RecoveryRecordSchema.safeParse(parsed);
  if (!result.success || !isSafeRoute(result.data.safeRoute)) {
    clearRecoveryRecord();
    return null;
  }
  const document = safeParseArchitectureDocument(result.data.document);
  if (!document.success) {
    clearRecoveryRecord();
    return null;
  }
  const age = now.getTime() - new Date(result.data.recordedAt).getTime();
  if (!Number.isFinite(age) || age < 0 || age > RECOVERY_TTL_MS) {
    clearRecoveryRecord();
    return null;
  }
  return {
    projectId: result.data.projectId,
    expectedRevision: result.data.expectedRevision,
    document: document.data,
    safeRoute: result.data.safeRoute,
    recordedAt: result.data.recordedAt,
  };
}

export function clearRecoveryRecord(): void {
  storage()?.removeItem(RECOVERY_KEY);
}
