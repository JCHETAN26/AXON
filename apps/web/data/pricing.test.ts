import { describe, expect, it } from "vitest";

import { AVAILABILITY_LABEL, PRICING_TIERS } from "./pricing";

describe("pricing tiers", () => {
  it("defines the three approved tiers at the approved prices", () => {
    expect(PRICING_TIERS.map((tier) => tier.id)).toEqual(["free", "builder", "pro"]);
    expect(PRICING_TIERS.map((tier) => tier.priceMonthly)).toEqual([0, 15, 24]);
  });

  it("gives every feature a typed, labelled availability", () => {
    for (const tier of PRICING_TIERS) {
      expect(tier.features.length).toBeGreaterThan(0);
      for (const feature of tier.features) {
        expect(AVAILABILITY_LABEL[feature.availability]).toBeDefined();
        expect(feature.label.length).toBeGreaterThan(0);
      }
    }
  });

  it("emphasizes Builder as a design choice, not a popularity claim", () => {
    const builder = PRICING_TIERS.find((tier) => tier.id === "builder");
    expect(builder?.emphasized).toBe(true);
    expect(builder?.emphasisLabel).toBe("Recommended for beta");
    const allText = JSON.stringify(PRICING_TIERS).toLowerCase();
    expect(allText).not.toContain("most popular");
  });

  it("labels unshipped capabilities as planned or preview", () => {
    const pro = PRICING_TIERS.find((tier) => tier.id === "pro");
    const availability = new Map(
      pro?.features.map((feature) => [feature.label, feature.availability]),
    );
    expect(availability.get("Continuous architecture synchronization")).toBe("planned");
    expect(availability.get("GitHub architecture workflows")).toBe("planned");
    expect(availability.get("Architecture drift alerts")).toBe("planned");
    expect(availability.get("Monitoring integrations")).toBe("product-preview");

    const builder = PRICING_TIERS.find((tier) => tier.id === "builder");
    expect(
      builder?.features.find((feature) => feature.label === "Bring-your-own-model support")
        ?.availability,
    ).toBe("planned");
  });

  it("avoids enterprise and urgency claims", () => {
    const allText = JSON.stringify(PRICING_TIERS).toLowerCase();
    for (const forbidden of ["sso", "unlimited team", "dedicated support", "discount", "save "]) {
      expect(allText).not.toContain(forbidden);
    }
  });
});
