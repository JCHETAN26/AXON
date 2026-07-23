import { safeParseMultiCloudState, type MultiCloudState } from "./multicloud-state";

const MULTICLOUD_KEY_PREFIX = "axon.multicloud.v1.";

export interface MultiCloudRepository {
  getMultiCloudState(projectId: string): Promise<MultiCloudState | null>;
  saveMultiCloudState(state: MultiCloudState): Promise<void>;
  deleteMultiCloudState(projectId: string): Promise<void>;
}

export class LocalStorageMultiCloudRepository implements MultiCloudRepository {
  private readonly storage: Storage;

  constructor(storage: Storage = window.localStorage) {
    this.storage = storage;
  }

  getMultiCloudState(projectId: string): Promise<MultiCloudState | null> {
    const raw = this.storage.getItem(MULTICLOUD_KEY_PREFIX + projectId);
    if (raw === null) return Promise.resolve(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return Promise.resolve(null);
    }
    const result = safeParseMultiCloudState(parsed);
    return Promise.resolve(result.success ? result.data : null);
  }

  saveMultiCloudState(state: MultiCloudState): Promise<void> {
    const validated = safeParseMultiCloudState(state);
    if (!validated.success) {
      return Promise.reject(new Error("Refusing to persist an invalid multi-cloud state"));
    }
    this.storage.setItem(
      MULTICLOUD_KEY_PREFIX + validated.data.projectId,
      JSON.stringify(validated.data),
    );
    return Promise.resolve();
  }

  deleteMultiCloudState(projectId: string): Promise<void> {
    this.storage.removeItem(MULTICLOUD_KEY_PREFIX + projectId);
    return Promise.resolve();
  }
}
