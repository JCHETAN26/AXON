import { HttpArtifactClient } from "@/lib/persistence/http-artifact-client";

import { type MultiCloudRepository } from "./multicloud-repository";
import { type MultiCloudState } from "./multicloud-state";

export class HttpMultiCloudRepository implements MultiCloudRepository {
  private readonly client = new HttpArtifactClient("multicloud");

  getMultiCloudState(projectId: string): Promise<MultiCloudState | null> {
    return this.client.get<MultiCloudState>(projectId);
  }

  saveMultiCloudState(state: MultiCloudState): Promise<void> {
    return this.client.save(state.projectId, state);
  }

  deleteMultiCloudState(projectId: string): Promise<void> {
    return this.client.delete(projectId);
  }
}
