import { safeParsePresentationState, type PresentationState } from "./presentation-state";

const PRESENTATION_KEY_PREFIX = "axon.presentation.v1.";

export interface PresentationRepository {
  getPresentationState(projectId: string): Promise<PresentationState | null>;
  savePresentationState(state: PresentationState): Promise<void>;
  deletePresentationState(projectId: string): Promise<void>;
}

export class LocalStoragePresentationRepository implements PresentationRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage;
  }

  getPresentationState(projectId: string): Promise<PresentationState | null> {
    const raw = this.storage.getItem(PRESENTATION_KEY_PREFIX + projectId);
    if (raw === null) return Promise.resolve(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Promise.resolve(null);
    }
    const result = safeParsePresentationState(parsed);
    return Promise.resolve(result.success ? result.data : null);
  }

  savePresentationState(state: PresentationState): Promise<void> {
    const validated = safeParsePresentationState(state);
    if (!validated.success) {
      return Promise.reject(new Error("Refusing to persist an invalid presentation state"));
    }
    this.storage.setItem(
      PRESENTATION_KEY_PREFIX + validated.data.projectId,
      JSON.stringify(validated.data),
    );
    return Promise.resolve();
  }

  deletePresentationState(projectId: string): Promise<void> {
    this.storage.removeItem(PRESENTATION_KEY_PREFIX + projectId);
    return Promise.resolve();
  }
}
