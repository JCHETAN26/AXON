import { z } from "zod";

const IMPORT_KEY_PREFIX = "axon.import.v1.";

/**
 * Persisted import draft. Only the reviewable *input* is stored — the raw
 * Compose text and the reviewer's category overrides — because the parsed
 * model, candidate, and warnings recompute deterministically from them plus
 * the importer version. Nothing here is an ArchitectureDocument; the draft is
 * reversible until it is explicitly approved.
 */
export const ImportDraftSchema = z.object({
  schemaVersion: z.literal("1.0"),
  projectId: z.string().min(1),
  composeText: z.string(),
  categoryOverrides: z.record(z.string().min(1), z.string().min(1)),
  updatedAt: z.iso.datetime(),
});

export type ImportDraft = z.infer<typeof ImportDraftSchema>;

export interface ImportRepository {
  getDraft(projectId: string): Promise<ImportDraft | null>;
  saveDraft(draft: ImportDraft): Promise<void>;
  deleteDraft(projectId: string): Promise<void>;
}

export class LocalStorageImportRepository implements ImportRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage;
  }

  getDraft(projectId: string): Promise<ImportDraft | null> {
    const raw = this.storage.getItem(IMPORT_KEY_PREFIX + projectId);
    if (raw === null) return Promise.resolve(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Promise.resolve(null);
    }
    const result = ImportDraftSchema.safeParse(parsed);
    return Promise.resolve(result.success ? result.data : null);
  }

  saveDraft(draft: ImportDraft): Promise<void> {
    const validated = ImportDraftSchema.safeParse(draft);
    if (!validated.success) {
      return Promise.reject(new Error("Refusing to persist an invalid import draft"));
    }
    this.storage.setItem(
      IMPORT_KEY_PREFIX + validated.data.projectId,
      JSON.stringify(validated.data),
    );
    return Promise.resolve();
  }

  deleteDraft(projectId: string): Promise<void> {
    this.storage.removeItem(IMPORT_KEY_PREFIX + projectId);
    return Promise.resolve();
  }
}
