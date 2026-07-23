import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyArchitectureDocument } from "@axon/diagram-schema";

import { CostWorkspace } from "./cost-workspace";

function fixtureDocument() {
  const doc = createEmptyArchitectureDocument({
    id: "doc-cost",
    projectId: "project-cost",
    name: "Cost fixture",
    now: "2026-07-23T00:00:00.000Z",
  });
  doc.nodes = [
    { id: "api", name: "API", category: "compute", meta: "aws_instance" },
    { id: "db", name: "Database", category: "database", meta: "aws_db_instance" },
    { id: "assets", name: "Assets", category: "storage", meta: "aws_s3_bucket" },
  ];
  return doc;
}

describe("CostWorkspace", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const target = String(url);
        if (target.includes("/cost/estimates")) {
          return Response.json({ estimates: [] });
        }
        return Response.json({ runId: "run-1" });
      }),
    );
  });

  it("renders modeled range, pricing basis, scale projections, limitations, and history", async () => {
    render(<CostWorkspace document={fixtureDocument()} />);

    expect(screen.getByRole("heading", { name: "Cost Explorer" })).toBeInTheDocument();
    expect(screen.getByText("Expected")).toBeInTheDocument();
    expect(
      screen.getByText("AWS · us-east-1 · USD · catalog 2026.07.test · effective 2026-07-01"),
    ).toBeInTheDocument();
    expect(screen.getByText("10x")).toBeInTheDocument();
    expect(screen.getByText("Cloud Comparison")).toBeInTheDocument();
    expect(screen.getByText("GCP · us-central1")).toBeInTheDocument();
    expect(screen.getByText("AZURE · eastus")).toBeInTheDocument();
    expect(screen.getByText("API")).toBeInTheDocument();
    expect(screen.getByText("Database")).toBeInTheDocument();
    expect(screen.getByText("Assets")).toBeInTheDocument();
    expect(screen.getByText(/not a provider invoice/i)).toBeInTheDocument();
    expect(await screen.findByText("No saved estimates yet.")).toBeInTheDocument();
  });

  it("saves the current estimate and refreshes history", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const target = String(url);
      if (target.includes("/cost/estimates")) {
        return Response.json({
          estimates: [
            {
              id: "run-1",
              provider: "aws",
              region: "us-east-1",
              pricingCatalogVersion: "2026.07.test",
              expectedMonthly: 123.45,
              confidence: "low",
              createdAt: "2026-07-23T00:00:00.000Z",
            },
          ],
        });
      }
      return Response.json({ runId: "run-1" });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<CostWorkspace document={fixtureDocument()} />);
    await userEvent.click(screen.getByRole("button", { name: "Save estimate" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/projects/project-cost/cost/estimate",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    expect(await screen.findByText("Estimate saved with catalog metadata.")).toBeInTheDocument();
    expect(await screen.findByText("$123.45 · 7/22/2026")).toBeInTheDocument();
  });
});
