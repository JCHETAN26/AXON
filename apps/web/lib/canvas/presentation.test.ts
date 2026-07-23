import { describe, expect, it } from "vitest";

import { buildPresentationSteps, renderPresentationHtml } from "./presentation";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-1",
  projectId: "project-1",
  now: "2026-03-01T00:00:00.000Z",
});

describe("buildPresentationSteps", () => {
  it("builds deterministic walkthrough steps from the architecture document", () => {
    const steps = buildPresentationSteps(DOCUMENT);

    expect(steps).toHaveLength(14);
    expect(steps[0]).toMatchObject({
      id: "overview",
      eyebrow: "Overview",
      title: "SaaS reference architecture",
    });
    expect(steps.at(-1)).toMatchObject({ id: "assumptions", title: "Model Inputs" });
  });
});

describe("renderPresentationHtml", () => {
  it("renders a standalone presentation export with the diagram and walkthrough", () => {
    const html = renderPresentationHtml(DOCUMENT);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("AXON presentation export");
    expect(html).toContain("<svg");
    expect(html).toContain("Presentation walkthrough");
    expect(html).toContain("Step 1 · Overview");
    expect(html).toContain("Model Inputs");
  });

  it("includes escaped speaker notes when provided", () => {
    const html = renderPresentationHtml(DOCUMENT, {
      speakerNotesByStepId: {
        overview: "Open with <why this matters> & keep it short.",
      },
    });

    expect(html).toContain("Speaker notes");
    expect(html).toContain("Open with &lt;why this matters&gt; &amp; keep it short.");
    expect(html).not.toContain("<why this matters>");
  });

  it("escapes document and step content", () => {
    const html = renderPresentationHtml({
      ...DOCUMENT,
      name: "A < B & C",
      groups: [{ id: "edge", label: '"quoted group"' }],
      nodes: [{ id: "api", name: "API <Gateway>", category: "compute", groupId: "edge" }],
      edges: [],
      assumptions: [{ id: "risk", label: "Risk", value: "<script>alert(1)</script>" }],
    });

    expect(html).toContain("A &lt; B &amp; C");
    expect(html).toContain("&quot;quoted group&quot;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
