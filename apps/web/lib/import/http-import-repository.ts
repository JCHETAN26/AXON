import { HttpArtifactClient } from "@/lib/persistence/http-artifact-client";
import { type ImportDraft, type ImportRepository } from "./import-repository";

/** Cloud-mode import-draft store over the owner-scoped artifacts route. */
export class HttpImportRepository implements ImportRepository {
  private readonly client = new HttpArtifactClient("import");

  getDraft(projectId: string): Promise<ImportDraft | null> {
    return this.client.get<ImportDraft>(projectId);
  }

  saveDraft(draft: ImportDraft): Promise<void> {
    return this.client.save(draft.projectId, draft);
  }

  deleteDraft(projectId: string): Promise<void> {
    return this.client.delete(projectId);
  }
}
