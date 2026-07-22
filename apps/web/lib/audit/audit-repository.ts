import { safeParseProjectAuditState, type ProjectAuditState } from "@axon/architecture-audit";

const AUDIT_KEY_PREFIX = "axon.audit.v1.";

/**
 * Persistence boundary for audit runs, mirroring ProjectRepository: async
 * interface so a remote backend can slot in later, local-first for now.
 */
export interface AuditRepository {
  getAuditState(projectId: string): Promise<ProjectAuditState | null>;
  saveAuditState(state: ProjectAuditState): Promise<void>;
  deleteAuditState(projectId: string): Promise<void>;
}

/** Validated reads only — a corrupt or outdated entry reads as "never run". */
export class LocalStorageAuditRepository implements AuditRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage;
  }

  getAuditState(projectId: string): Promise<ProjectAuditState | null> {
    const raw = this.storage.getItem(AUDIT_KEY_PREFIX + projectId);
    if (raw === null) {
      return Promise.resolve(null);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Promise.resolve(null);
    }
    const result = safeParseProjectAuditState(parsed);
    return Promise.resolve(result.success ? result.data : null);
  }

  saveAuditState(state: ProjectAuditState): Promise<void> {
    const validated = safeParseProjectAuditState(state);
    if (!validated.success) {
      return Promise.reject(new Error("Refusing to persist an invalid audit state"));
    }
    this.storage.setItem(
      AUDIT_KEY_PREFIX + validated.data.projectId,
      JSON.stringify(validated.data),
    );
    return Promise.resolve();
  }

  deleteAuditState(projectId: string): Promise<void> {
    this.storage.removeItem(AUDIT_KEY_PREFIX + projectId);
    return Promise.resolve();
  }
}
