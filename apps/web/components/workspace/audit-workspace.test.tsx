import { type ProjectAuditState } from "@axon/architecture-audit";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuditWorkspace } from "./audit-workspace";
import { computeNextAuditState } from "@/lib/audit/run-project-audit";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";

const NOW = "2026-02-01T00:00:00.000Z";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-1",
  projectId: "project-1",
  now: NOW,
});

describe("AuditWorkspace", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("explains the audit before the first run", () => {
    render(<AuditWorkspace document={DOCUMENT} auditState={null} onAuditStateChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Run Audit" })).toBeVisible();
    expect(screen.getByRole("status", { name: "Audit status" })).toHaveTextContent(/NEVER_RUN/);
    expect(screen.getByText("This project has not been audited yet.")).toBeVisible();
    expect(screen.getByText(/no runtime data, no AI/)).toBeVisible();
  });

  it("runs the audit, persists it, and lists the findings", async () => {
    const onAuditStateChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AuditWorkspace
        document={DOCUMENT}
        auditState={null}
        onAuditStateChange={onAuditStateChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Run Audit" }));

    await waitFor(() => {
      expect(onAuditStateChange).toHaveBeenCalledTimes(1);
    });
    const state = onAuditStateChange.mock.calls[0]?.[0] as ProjectAuditState;
    expect(state.findings).toHaveLength(5);
    // Persisted under the project key.
    expect(window.localStorage.getItem("axon.audit.v1.project-1")).not.toBeNull();
  });

  it("shows findings, staleness, and the acknowledge flow", async () => {
    const initial = computeNextAuditState({ document: DOCUMENT, previous: null, now: NOW });
    let latest: ProjectAuditState = initial;
    const user = userEvent.setup();
    const { rerender } = render(
      <AuditWorkspace
        document={DOCUMENT}
        auditState={initial}
        onAuditStateChange={(next) => {
          latest = next;
        }}
      />,
    );

    expect(screen.getByRole("status", { name: "Audit status" })).toHaveTextContent(/UP_TO_DATE/);
    expect(screen.getByText("Findings (5)")).toBeVisible();

    // Open the gateway SPOF finding and acknowledge it.
    await user.click(
      screen.getByRole("button", { name: /Potential single point of failure: "api-gateway"/ }),
    );
    expect(screen.getByText("What AXON detected")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Acknowledge" }));

    await waitFor(() => {
      expect(latest.findings.find((finding) => finding.title.includes("api-gateway"))?.state).toBe(
        "acknowledged",
      );
    });

    rerender(
      <AuditWorkspace document={DOCUMENT} auditState={latest} onAuditStateChange={vi.fn()} />,
    );
    expect(screen.getAllByText("Acknowledged").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Reopen" })).toBeVisible();
  });

  it("flags a stale audit when the document changed after the run", () => {
    const state = computeNextAuditState({ document: DOCUMENT, previous: null, now: NOW });
    render(
      <AuditWorkspace
        document={{ ...DOCUMENT, updatedAt: "2026-02-02T00:00:00.000Z" }}
        auditState={state}
        onAuditStateChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("status", { name: "Audit status" })).toHaveTextContent(
      /ARCHITECTURE_CHANGED/,
    );
    expect(screen.getByRole("button", { name: "Rerun Audit" })).toBeVisible();
  });
});
