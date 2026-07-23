import { ThemeProvider } from "@axon/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PullRequestReviewWorkspace, type PrRunSummary } from "./pr-review-workspace";

const RUNS: PrRunSummary[] = [
  {
    id: "run-1",
    prNumber: 42,
    prTitle: "Add Terraform Subnets",
    prAuthor: "octocat",
    headSha: "head12345",
    baseSha: "base12345",
    status: "completed",
    architectureRisk: "high",
    createdAt: "2026-04-01T00:00:00.000Z",
  },
];

function renderWorkspace(overrides: Partial<Parameters<typeof PullRequestReviewWorkspace>[0]> = {}) {
  const props = {
    repositoryFullName: "org/sample-repo",
    runs: RUNS,
    proposal: null,
    onAnalyzePr: vi.fn().mockResolvedValue(undefined),
    onPostComment: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(
    <ThemeProvider>
      <PullRequestReviewWorkspace {...props} />
    </ThemeProvider>
  );
  return props;
}

describe("PullRequestReviewWorkspace", () => {
  it("renders PR architecture review metadata and risk badge", () => {
    renderWorkspace();

    expect(screen.getByText("GitHub Pull-Request Architecture Reviews")).toBeVisible();
    expect(screen.getAllByText("PR #42: Add Terraform Subnets")[0]).toBeVisible();
    expect(screen.getAllByText(/HIGH/i)[0]).toBeVisible();
  });

  it("triggers post comment action when clicked", async () => {
    const user = userEvent.setup();
    const props = renderWorkspace();

    await user.click(screen.getByRole("button", { name: /POST COMMENT TO GITHUB/ }));
    expect(props.onPostComment).toHaveBeenCalledWith(42, "run-1");
  });
});
