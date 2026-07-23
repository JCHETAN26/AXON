import { describe, expect, it } from "vitest";

import { deriveCostOverlay } from "./cost-overlay-context";
import { createSampleArchitectureDocument } from "@/lib/projects/sample-project";

const DOCUMENT = createSampleArchitectureDocument({
  id: "doc-1",
  projectId: "project-1",
  now: "2026-03-01T00:00:00.000Z",
});

describe("deriveCostOverlay", () => {
  it("marks only the bounded top cost drivers", () => {
    const overlay = deriveCostOverlay(DOCUMENT);
    expect(overlay.size).toBeLessThanOrEqual(3);
    expect(overlay.get("app")?.expectedMonthly).toBeGreaterThan(0);
    expect(
      [...overlay.values()].every((entry) => entry.pricingCatalogVersion === "2026.07.test"),
    ).toBe(true);
  });
});
