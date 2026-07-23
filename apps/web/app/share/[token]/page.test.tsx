// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import SharedProjectPage from "./page";
import { ShareLinkService } from "@/lib/server/collaboration/share-link-service";
import { getDatabaseAsync, type Database } from "@/lib/server/db/client";
import { resetTestDatabase } from "@/lib/server/db/testing";
import { ServerProjectRepository } from "@/lib/server/repositories/server-project-repository";
import { seedUser } from "@/lib/server/test-support/seed";

let db: Database;

beforeAll(async () => {
  process.env.AXON_DB_DRIVER = "pglite";
  db = await getDatabaseAsync();
});

beforeEach(async () => {
  await resetTestDatabase(db);
});

describe("SharedProjectPage", () => {
  it("renders a read-only architecture page for an active share token", async () => {
    const ownerId = await seedUser(db, "share-page-owner@example.com");
    const project = await new ServerProjectRepository(db, ownerId).createProject({
      name: "Shared Page",
      template: "sample",
    });
    const shareLink = await new ShareLinkService(db, ownerId).createShareLink({
      projectId: project.project.id,
      role: "viewer",
    });

    render(await SharedProjectPage({ params: Promise.resolve({ token: shareLink.rawToken }) }));

    expect(screen.getByRole("heading", { name: "Shared Page" })).toBeVisible();
    expect(screen.getByText(/READ_ONLY/)).toBeVisible();
    expect(screen.getByLabelText("Shared Page shared architecture diagram")).toBeVisible();
    expect(screen.getByText("Services")).toBeVisible();
    expect(screen.getByText("Connections")).toBeVisible();
  });
});
