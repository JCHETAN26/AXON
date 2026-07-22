import { createEmptyArchitectureDocument } from "@axon/diagram-schema";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpProjectRepository } from "./http-repository";

function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => Promise.resolve(handler(url, init)));
}

const repo = new HttpProjectRepository();

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HttpProjectRepository", () => {
  it("lists projects from the owner-scoped endpoint", async () => {
    mockFetch((url) => {
      expect(url).toBe("/api/projects");
      return Response.json({ projects: [{ id: "p1", name: "One" }] });
    });
    const projects = await repo.listProjects();
    expect(projects[0]?.id).toBe("p1");
  });

  it("translates a 404 into null rather than surfacing existence", async () => {
    mockFetch(() => Response.json({ error: "Project not found." }, { status: 404 }));
    expect(await repo.getProject("someone-elses-id")).toBeNull();
  });

  it("sends the document on update and returns the saved pair", async () => {
    const document = createEmptyArchitectureDocument({
      id: "p1",
      projectId: "p1",
      name: "One",
      now: "2026-07-20T00:00:00.000Z",
    });
    mockFetch((url, init) => {
      expect(url).toBe("/api/projects/p1");
      expect(init?.method).toBe("PUT");
      const body = JSON.parse(String(init?.body)) as { document: unknown };
      expect(body.document).toBeDefined();
      return Response.json({ project: { id: "p1", name: "One" }, document, version: 2 });
    });
    const saved = await repo.updateDocument("p1", document);
    expect(saved.document.id).toBe("p1");
  });

  it("propagates a non-404 error", async () => {
    mockFetch(() => Response.json({ error: "conflict" }, { status: 409 }));
    await expect(
      repo.updateDocument(
        "p1",
        createEmptyArchitectureDocument({
          id: "p1",
          projectId: "p1",
          name: "One",
          now: "2026-07-20T00:00:00.000Z",
        }),
      ),
    ).rejects.toThrow(/conflict/);
  });

  it("sends the last observed revision as expectedVersion on the next save", async () => {
    const fresh = new HttpProjectRepository();
    const document = createEmptyArchitectureDocument({
      id: "cv",
      projectId: "cv",
      name: "CV",
      now: "2026-07-20T00:00:00.000Z",
    });

    // No prior version known → first save omits expectedVersion.
    mockFetch((url, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect("expectedVersion" in body).toBe(false);
      return Response.json({ project: { id: "cv", name: "CV" }, document, version: 5 });
    });
    await fresh.updateDocument("cv", document);

    // Response carried version 5 → the next save must claim expectedVersion 5.
    let sent: number | undefined;
    mockFetch((url, init) => {
      const body = JSON.parse(String(init?.body)) as { expectedVersion?: number };
      sent = body.expectedVersion;
      return Response.json({ project: { id: "cv", name: "CV" }, document, version: 6 });
    });
    await fresh.updateDocument("cv", document);
    expect(sent).toBe(5);
  });

  it("seeds the revision from a reload so a stale save conflicts", async () => {
    const fresh = new HttpProjectRepository();
    const document = createEmptyArchitectureDocument({
      id: "rv",
      projectId: "rv",
      name: "RV",
      now: "2026-07-20T00:00:00.000Z",
    });
    mockFetch(() => Response.json({ project: { id: "rv", name: "RV" }, document, version: 9 }));
    await fresh.getProject("rv");

    let sent: number | undefined;
    mockFetch((url, init) => {
      sent = (JSON.parse(String(init?.body)) as { expectedVersion?: number }).expectedVersion;
      return Response.json({ error: "conflict" }, { status: 409 });
    });
    await expect(fresh.updateDocument("rv", document)).rejects.toThrow();
    expect(sent).toBe(9);
  });

  it("encodes ids in the URL path", async () => {
    mockFetch((url) => {
      expect(url).toBe("/api/projects/a%2Fb");
      return new Response(null, { status: 204 });
    });
    await repo.deleteProject("a/b");
  });
});
