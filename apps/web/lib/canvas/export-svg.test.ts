import { afterEach, describe, expect, it, vi } from "vitest";

import {
  renderArchitectureHtml,
  renderArchitecturePngBlob,
  renderArchitectureSvg,
} from "./export-svg";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-1",
  projectId: "project-1",
  now: "2026-03-01T00:00:00.000Z",
});

describe("renderArchitectureSvg", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a deterministic SVG with labels, edges, and icon metadata", () => {
    const first = renderArchitectureSvg(DOCUMENT);
    const second = renderArchitectureSvg(DOCUMENT);
    expect(first).toBe(second);
    expect(first).toContain("<svg");
    expect(first).toContain("SaaS reference architecture");
    expect(first).toContain("postgresql");
    expect(first).toContain("Amazon RDS");
    expect(first).toContain("gateway-app");
  });

  it("escapes XML-sensitive document content", () => {
    const svg = renderArchitectureSvg({
      ...DOCUMENT,
      name: "A < B & C",
      nodes: [{ id: "x", name: '"quoted"', category: "custom" }],
      edges: [],
    });
    expect(svg).toContain("A &lt; B &amp; C");
    expect(svg).toContain("&quot;quoted&quot;");
  });

  it("honors explicit node icon ids", () => {
    const svg = renderArchitectureSvg({
      ...DOCUMENT,
      nodes: [{ id: "queue", name: "events", category: "queue", iconId: "azure.service-bus" }],
      edges: [],
    });
    expect(svg).toContain("Azure Service Bus");
  });

  it("renders a standalone HTML architecture export", () => {
    const html = renderArchitectureHtml(DOCUMENT);
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("SaaS reference architecture architecture export");
    expect(html).toContain("<svg");
    expect(html).toContain("AXON architecture export");
    expect(html).toContain("Assumptions");
  });

  it("rasterizes the deterministic SVG to a PNG blob", async () => {
    const originalImage = globalThis.Image;
    class TestImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        queueMicrotask(() => {
          this.onload?.();
        });
      }
    }
    vi.stubGlobal("Image", TestImage);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:architecture");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation((_url) => {
      void _url;
    });

    const originalCreateElement = document.createElement.bind(document);
    const drawImage = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        fillStyle: "",
        fillRect: vi.fn(),
        drawImage,
      })),
      toBlob: vi.fn((callback: BlobCallback) => {
        callback(new Blob(["png"], { type: "image/png" }));
      }),
    } as unknown as HTMLCanvasElement;
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "canvas") return canvas;
      return originalCreateElement(tagName);
    });

    const blob = await renderArchitecturePngBlob(DOCUMENT, { scale: 1 });
    expect(blob.type).toBe("image/png");
    expect(drawImage).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:architecture");
    vi.stubGlobal("Image", originalImage);
  });
});
