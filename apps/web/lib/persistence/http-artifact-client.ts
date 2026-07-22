import { type ArtifactKind } from "@/lib/server/db/schema";
import { fetchJson } from "./http-client";

/**
 * Thin client for one project artifact kind, backed by the owner-scoped
 * `/api/projects/:id/artifacts/:kind` route. The server enforces
 * authentication and ownership, so this carries no authorization logic itself.
 */
export class HttpArtifactClient {
  constructor(private readonly kind: ArtifactKind) {}

  async get<T>(projectId: string): Promise<T | null> {
    const body = await fetchJson<{ payload: T | null }>(this.url(projectId));
    return body.payload;
  }

  async save(projectId: string, payload: unknown): Promise<void> {
    await fetchJson(this.url(projectId), {
      method: "PUT",
      body: JSON.stringify({ payload }),
      parse: false,
    });
  }

  async delete(projectId: string): Promise<void> {
    await fetchJson(this.url(projectId), { method: "DELETE", parse: false });
  }

  private url(projectId: string): string {
    return `/api/projects/${encodeURIComponent(projectId)}/artifacts/${this.kind}`;
  }
}
