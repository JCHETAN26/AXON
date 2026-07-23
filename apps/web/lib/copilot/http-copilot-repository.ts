import { HttpArtifactClient } from "@/lib/persistence/http-artifact-client";

import { type CopilotRepository } from "./copilot-repository";
import { type CopilotState } from "./copilot-state";

export class HttpCopilotRepository implements CopilotRepository {
  private readonly client = new HttpArtifactClient("copilot");

  getCopilotState(projectId: string): Promise<CopilotState | null> {
    return this.client.get<CopilotState>(projectId);
  }

  saveCopilotState(state: CopilotState): Promise<void> {
    return this.client.save(state.projectId, state);
  }

  deleteCopilotState(projectId: string): Promise<void> {
    return this.client.delete(projectId);
  }
}
