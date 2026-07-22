import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ArchitectureGenerationDemo,
  GENERATION_TICK_MS,
  TOTAL_GENERATION_TICKS,
  deriveGenerationView,
} from "./architecture-generation-demo";
import { DEMO_NODES, GENERATION_ORDER, GENERATION_STAGES } from "@/data/demo-architecture";

describe("deriveGenerationView", () => {
  it("starts parsing with nothing revealed", () => {
    expect(deriveGenerationView(0)).toEqual({ stageIndex: 0, revealedCount: 0, done: false });
  });

  it("reveals nodes one at a time while resolving dependencies", () => {
    const view = deriveGenerationView(3);
    expect(view.stageIndex).toBe(1);
    expect(view.revealedCount).toBe(1);
  });

  it("finishes with every node revealed and the final stage active", () => {
    const view = deriveGenerationView(TOTAL_GENERATION_TICKS);
    expect(view).toEqual({
      stageIndex: GENERATION_STAGES.length - 1,
      revealedCount: GENERATION_ORDER.length,
      done: true,
    });
  });
});

describe("ArchitectureGenerationDemo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the fully generated architecture by default", () => {
    render(<ArchitectureGenerationDemo />);
    expect(screen.getByRole("status")).toHaveTextContent(/ARCHITECTURE_COMPLETE/);
    for (const node of DEMO_NODES) {
      expect(screen.getByText(node.name)).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Replay Generation" })).toBeEnabled();
  });

  it("replays through the stages and completes again", () => {
    render(<ArchitectureGenerationDemo />);
    fireEvent.click(screen.getByRole("button", { name: "Replay Generation" }));
    expect(screen.getByRole("status")).toHaveTextContent(/GENERATING · Parsing requirements/);
    expect(screen.getByRole("button", { name: "Replay Generation" })).toBeDisabled();

    act(() => {
      vi.advanceTimersByTime(GENERATION_TICK_MS * 6);
    });
    expect(screen.getByRole("status")).toHaveTextContent(/Resolving service dependencies/);

    act(() => {
      vi.advanceTimersByTime(GENERATION_TICK_MS * (TOTAL_GENERATION_TICKS + 2));
    });
    expect(screen.getByRole("status")).toHaveTextContent(/ARCHITECTURE_COMPLETE/);
    expect(screen.getByRole("button", { name: "Replay Generation" })).toBeEnabled();
  });

  it("announces progress through a polite live region", () => {
    render(<ArchitectureGenerationDemo />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });

  it("lists every generation stage from the dataset", () => {
    render(<ArchitectureGenerationDemo />);
    for (const stage of GENERATION_STAGES) {
      expect(screen.getByText(stage.label)).toBeInTheDocument();
    }
  });
});
