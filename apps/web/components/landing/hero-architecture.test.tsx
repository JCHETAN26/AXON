import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AUDIT_REVEAL_INTERVAL_MS, HeroArchitecture } from "./hero-architecture";
import { DEMO_FINDINGS } from "@/data/demo-architecture";

const FIRST_FINDING = DEMO_FINDINGS[0];
const ALL_REVEALED_MS = AUDIT_REVEAL_INTERVAL_MS * (DEMO_FINDINGS.length + 1);

describe("HeroArchitecture audit interaction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts idle with no findings revealed", () => {
    render(<HeroArchitecture />);
    expect(screen.getByRole("status")).toHaveTextContent(/AUDIT_IDLE/);
    if (FIRST_FINDING !== undefined) {
      expect(screen.queryAllByText(FIRST_FINDING.title)).toHaveLength(0);
    }
    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  it("reveals findings progressively from the typed dataset", () => {
    render(<HeroArchitecture />);
    fireEvent.click(screen.getByRole("button", { name: "Run Audit" }));
    expect(screen.getByRole("status")).toHaveTextContent(/AUDIT_RUNNING/);
    expect(screen.getByRole("button", { name: "Run Audit" })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(AUDIT_REVEAL_INTERVAL_MS);
    });
    if (FIRST_FINDING !== undefined) {
      expect(screen.getAllByText(FIRST_FINDING.title).length).toBeGreaterThan(0);
    }
    const lastFinding = DEMO_FINDINGS[DEMO_FINDINGS.length - 1];
    if (lastFinding !== undefined) {
      expect(screen.queryAllByText(lastFinding.title)).toHaveLength(0);
    }

    act(() => {
      vi.advanceTimersByTime(ALL_REVEALED_MS);
    });
    for (const finding of DEMO_FINDINGS) {
      expect(screen.getAllByText(finding.title).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("status")).toHaveTextContent(/AUDIT_COMPLETE/);
    expect(screen.getByRole("status")).toHaveTextContent(/3 risks/);
  });

  it("announces progress through a polite live region", () => {
    render(<HeroArchitecture />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("resets to idle and clears revealed findings", () => {
    render(<HeroArchitecture />);
    fireEvent.click(screen.getByRole("button", { name: "Run Audit" }));
    act(() => {
      vi.advanceTimersByTime(ALL_REVEALED_MS);
    });
    expect(screen.getByRole("status")).toHaveTextContent(/AUDIT_COMPLETE/);

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByRole("status")).toHaveTextContent(/AUDIT_IDLE/);
    if (FIRST_FINDING !== undefined) {
      expect(screen.queryAllByText(FIRST_FINDING.title)).toHaveLength(0);
    }
  });

  it("supports rerunning the audit after completion", () => {
    render(<HeroArchitecture />);
    fireEvent.click(screen.getByRole("button", { name: "Run Audit" }));
    act(() => {
      vi.advanceTimersByTime(ALL_REVEALED_MS);
    });
    const runButton = screen.getByRole("button", { name: "Run Audit" });
    expect(runButton).toBeEnabled();
    fireEvent.click(runButton);
    expect(screen.getByRole("status")).toHaveTextContent(/AUDIT_RUNNING/);
  });
});
