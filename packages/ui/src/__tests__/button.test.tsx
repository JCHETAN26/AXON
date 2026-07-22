import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "../button";

describe("Button", () => {
  it("renders an accessible button with its label", () => {
    render(<Button>Run Audit</Button>);
    expect(screen.getByRole("button", { name: "Run Audit" })).toBeInTheDocument();
  });

  it("defaults to type=button so it never submits forms accidentally", () => {
    render(<Button>Simulate Traffic</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("invokes onClick when activated", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Preview Change</Button>);
    await user.click(screen.getByRole("button", { name: "Preview Change" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not invoke onClick when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Apply Patch
      </Button>,
    );
    await user.click(screen.getByRole("button", { name: "Apply Patch" }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("supports every variant without crashing", () => {
    render(
      <>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="technical">axon audit --run</Button>
      </>,
    );
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });
});
