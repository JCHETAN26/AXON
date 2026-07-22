import { type AuditFinding } from "@axon/architecture-audit";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FindingInspector } from "./finding-inspector";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-1",
  projectId: "project-1",
  now: "2026-01-01T00:00:00.000Z",
});

const FINDING: AuditFinding = {
  fingerprint: "fp-gateway",
  ruleId: "single-point-of-failure",
  ruleVersion: "1.0.0",
  severity: "high",
  title: 'Potential single point of failure: "api-gateway"',
  detected: '"api-gateway" is the only represented path connecting 2 components.',
  elementIds: ["gateway"],
  evidence: [{ text: '"api-gateway" participates in 3 represented connections.', elementIds: [] }],
  inference: "Based on the current architecture document, AXON infers a structural risk.",
  limitation: "This rule reads only the architecture document.",
  recommendation: 'Review whether "api-gateway" has redundancy in production.',
  state: "open",
  firstDetectedAt: "2026-01-01T00:00:00.000Z",
  lastSeenAt: "2026-01-01T00:00:00.000Z",
};

describe("FindingInspector", () => {
  it("shows the full evidence trail with honest framing", () => {
    render(
      <FindingInspector
        finding={FINDING}
        document={DOCUMENT}
        onAcknowledge={vi.fn()}
        onReopen={vi.fn()}
      />,
    );
    expect(screen.getByText("What AXON detected")).toBeVisible();
    expect(screen.getByText(/only represented path connecting/)).toBeVisible();
    // Element ids resolve to human names from the document.
    expect(screen.getByText("api-gateway")).toBeVisible();
    expect(screen.getByText(/participates in 3 represented connections/)).toBeVisible();
    expect(screen.getByText("What AXON inferred")).toBeVisible();
    expect(screen.getByText("Limitation of this rule")).toBeVisible();
    expect(screen.getByText("Recommended review")).toBeVisible();
    expect(
      screen.getByText("Deterministic analysis · based on the current architecture document"),
    ).toBeVisible();
    expect(screen.getByText(/single-point-of-failure v1\.0\.0/)).toBeVisible();
  });

  it("offers Acknowledge for open findings", async () => {
    const onAcknowledge = vi.fn();
    const user = userEvent.setup();
    render(
      <FindingInspector
        finding={FINDING}
        document={DOCUMENT}
        onAcknowledge={onAcknowledge}
        onReopen={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Acknowledge" }));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Reopen" })).not.toBeInTheDocument();
  });

  it("offers Reopen for acknowledged findings and nothing for resolved ones", () => {
    const { rerender } = render(
      <FindingInspector
        finding={{ ...FINDING, state: "acknowledged" }}
        document={DOCUMENT}
        onAcknowledge={vi.fn()}
        onReopen={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Reopen" })).toBeVisible();

    rerender(
      <FindingInspector
        finding={{ ...FINDING, state: "resolved", resolvedAt: "2026-01-02T00:00:00.000Z" }}
        document={DOCUMENT}
        onAcknowledge={vi.fn()}
        onReopen={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Acknowledge" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reopen" })).not.toBeInTheDocument();
  });

  it("labels elements that were deleted after the audit ran", () => {
    render(
      <FindingInspector
        finding={{ ...FINDING, elementIds: ["ghost-node"] }}
        document={DOCUMENT}
        onAcknowledge={vi.fn()}
        onReopen={vi.fn()}
      />,
    );
    expect(screen.getByText("ghost-node (no longer in the document)")).toBeVisible();
  });
});
