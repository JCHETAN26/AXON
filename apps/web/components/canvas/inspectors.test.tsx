import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EdgeInspector } from "./edge-inspector";
import { NodeInspector } from "./node-inspector";
import { type CanvasEdge, type CanvasNode } from "@/lib/canvas/adapters";

const NODE: CanvasNode = {
  id: "postgres",
  type: "architecture",
  position: { x: 0, y: 0 },
  data: { name: "postgresql", category: "Database", groupId: "data", meta: "conn 82/300" },
};

const OTHER: CanvasNode = {
  id: "app",
  type: "architecture",
  position: { x: 0, y: 0 },
  data: { name: "app-service", category: "Compute" },
};

const EDGE: CanvasEdge = {
  id: "app--postgres--data",
  type: "architecture",
  source: "app",
  target: "postgres",
  data: { kind: "data" },
};

const GROUPS = [
  { id: "data", label: "Data Layer" },
  { id: "edge", label: "Public Edge" },
];

describe("NodeInspector", () => {
  it("shows the node's fields", () => {
    render(<NodeInspector node={NODE} groups={GROUPS} onChange={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByLabelText("Service name")).toHaveValue("postgresql");
    expect(screen.getByLabelText("Category")).toHaveValue("Database");
    expect(screen.getByLabelText("Group")).toHaveValue("data");
    expect(screen.getByLabelText("Technical note")).toHaveValue("conn 82/300");
    expect(screen.getByText("id: postgres")).toBeInTheDocument();
  });

  it("emits patches for edits and clears optional fields", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<NodeInspector node={NODE} groups={GROUPS} onChange={onChange} onDelete={vi.fn()} />);

    await user.type(screen.getByLabelText("Service name"), "!");
    expect(onChange).toHaveBeenLastCalledWith({ name: "postgresql!" });

    await user.selectOptions(screen.getByLabelText("Group"), "");
    expect(onChange).toHaveBeenLastCalledWith({ groupId: undefined });

    await user.clear(screen.getByLabelText("Technical note"));
    expect(onChange).toHaveBeenLastCalledWith({ meta: undefined });

    await user.click(screen.getByLabelText("Planned (not yet running)"));
    expect(onChange).toHaveBeenLastCalledWith({ planned: true });
  });

  it("delegates deletion", async () => {
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<NodeInspector node={NODE} groups={GROUPS} onChange={vi.fn()} onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "Delete Node" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe("EdgeInspector", () => {
  it("names both endpoints and the current kind", () => {
    render(
      <EdgeInspector edge={EDGE} nodes={[NODE, OTHER]} onKindChange={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.getByText(/app-service/)).toBeInTheDocument();
    expect(screen.getByText(/postgresql/)).toBeInTheDocument();
    expect(screen.getByLabelText("Connection kind")).toHaveValue("data");
  });

  it("changes the connection kind and deletes", async () => {
    const onKindChange = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(
      <EdgeInspector
        edge={EDGE}
        nodes={[NODE, OTHER]}
        onKindChange={onKindChange}
        onDelete={onDelete}
      />,
    );
    await user.selectOptions(screen.getByLabelText("Connection kind"), "async");
    expect(onKindChange).toHaveBeenCalledWith("async");
    await user.click(screen.getByRole("button", { name: "Delete Connection" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
