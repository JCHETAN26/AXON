import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TerminalBlock } from "../terminal-block";

describe("TerminalBlock", () => {
  it("renders every line with the default title", () => {
    render(<TerminalBlock lines={["npx axon scan .", "npx axon audit architecture.json"]} />);
    expect(screen.getByText("terminal")).toBeVisible();
    expect(screen.getByText("npx axon scan .")).toBeVisible();
    expect(screen.getByText("npx axon audit architecture.json")).toBeVisible();
  });

  it("hides the prompt glyph from assistive technology", () => {
    render(<TerminalBlock lines={["one"]} />);
    const prompts = document.querySelectorAll("[aria-hidden]");
    expect(prompts.length).toBeGreaterThan(0);
  });

  it("supports a custom title and promptless output", () => {
    render(<TerminalBlock title="scan.log" prompt="" lines={["12 services detected"]} />);
    expect(screen.getByText("scan.log")).toBeVisible();
    expect(screen.getByText("12 services detected")).toBeVisible();
  });
});
