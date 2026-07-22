import { type ProjectAuditState } from "@axon/architecture-audit";

import { HttpArtifactClient } from "@/lib/persistence/http-artifact-client";
import { type AuditRepository } from "./audit-repository";

/** Cloud-mode audit store over the owner-scoped artifacts route. */
export class HttpAuditRepository implements AuditRepository {
  private readonly client = new HttpArtifactClient("audit");

  getAuditState(projectId: string): Promise<ProjectAuditState | null> {
    return this.client.get<ProjectAuditState>(projectId);
  }

  saveAuditState(state: ProjectAuditState): Promise<void> {
    return this.client.save(state.projectId, state);
  }

  deleteAuditState(projectId: string): Promise<void> {
    return this.client.delete(projectId);
  }
}
