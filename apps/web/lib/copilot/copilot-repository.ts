import { safeParseCopilotState, type CopilotState } from "./copilot-state";

const COPILOT_KEY_PREFIX = "axon.copilot.v1.";

export interface CopilotRepository {
  getCopilotState(projectId: string): Promise<CopilotState | null>;
  saveCopilotState(state: CopilotState): Promise<void>;
  deleteCopilotState(projectId: string): Promise<void>;
}

export class LocalStorageCopilotRepository implements CopilotRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage;
  }

  getCopilotState(projectId: string): Promise<CopilotState | null> {
    const raw = this.storage.getItem(COPILOT_KEY_PREFIX + projectId);
    if (raw === null) return Promise.resolve(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Promise.resolve(null);
    }
    const result = safeParseCopilotState(parsed);
    return Promise.resolve(result.success ? result.data : null);
  }

  saveCopilotState(state: CopilotState): Promise<void> {
    const validated = safeParseCopilotState(state);
    if (!validated.success) {
      return Promise.reject(new Error("Refusing to persist an invalid copilot state"));
    }
    this.storage.setItem(COPILOT_KEY_PREFIX + validated.data.projectId, JSON.stringify(validated.data));
    return Promise.resolve();
  }

  deleteCopilotState(projectId: string): Promise<void> {
    this.storage.removeItem(COPILOT_KEY_PREFIX + projectId);
    return Promise.resolve();
  }
}
