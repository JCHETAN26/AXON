import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusBadge, type StatusKind } from "../status-badge";

const KINDS: StatusKind[] = ["critical", "warning", "success", "info", "neutral"];

describe("StatusBadge", () => {
  it("renders a visible text label for every kind", () => {
    render(
      <>
        {KINDS.map((kind) => (
          <StatusBadge key={kind} kind={kind}>
            {kind}
          </StatusBadge>
        ))}
      </>,
    );
    for (const kind of KINDS) {
      expect(screen.getByText(kind)).toBeVisible();
    }
  });

  it("pairs the label with a non-color icon indicator", () => {
    const { container } = render(<StatusBadge kind="critical">Outage</StatusBadge>);
    const icon = container.querySelector("svg");
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});
