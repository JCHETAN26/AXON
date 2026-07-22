import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { CanvasToolbar, CanvasToolbarButton, CanvasToolbarSeparator } from "../canvas-toolbar";

function renderToolbar() {
  return render(
    <CanvasToolbar label="Canvas controls">
      <CanvasToolbarButton label="Zoom in">+</CanvasToolbarButton>
      <CanvasToolbarButton label="Zoom out">−</CanvasToolbarButton>
      <CanvasToolbarSeparator />
      <CanvasToolbarButton label="Toggle grid">#</CanvasToolbarButton>
    </CanvasToolbar>,
  );
}

describe("CanvasToolbar", () => {
  it("exposes toolbar semantics and accessible button names", () => {
    renderToolbar();
    expect(screen.getByRole("toolbar", { name: "Canvas controls" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Toggle grid" })).toBeInTheDocument();
  });

  it("moves focus with arrow keys, wrapping at the edges", async () => {
    const user = userEvent.setup();
    renderToolbar();
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    const zoomOut = screen.getByRole("button", { name: "Zoom out" });
    const grid = screen.getByRole("button", { name: "Toggle grid" });

    zoomIn.focus();
    await user.keyboard("{ArrowRight}");
    expect(zoomOut).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(grid).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(zoomIn).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(grid).toHaveFocus();
  });

  it("supports Home and End", async () => {
    const user = userEvent.setup();
    renderToolbar();
    const zoomIn = screen.getByRole("button", { name: "Zoom in" });
    const grid = screen.getByRole("button", { name: "Toggle grid" });

    zoomIn.focus();
    await user.keyboard("{End}");
    expect(grid).toHaveFocus();
    await user.keyboard("{Home}");
    expect(zoomIn).toHaveFocus();
  });
});
