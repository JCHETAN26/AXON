import { describe, expect, it } from "vitest";

import { getLegalConfig } from "./legal-config";

describe("getLegalConfig", () => {
  it("marks development placeholders when values are unset", () => {
    const config = getLegalConfig({} as NodeJS.ProcessEnv);
    expect(config.usingPlaceholders).toBe(true);
    expect(config.companyName).toContain("[configure before launch]");
  });

  it("uses configured values and reports no placeholders", () => {
    const config = getLegalConfig({
      AXON_LEGAL_COMPANY_NAME: "AXON Inc.",
      AXON_LEGAL_SUPPORT_EMAIL: "support@axon.example",
      AXON_LEGAL_PRIVACY_EMAIL: "privacy@axon.example",
      AXON_LEGAL_EFFECTIVE_DATE: "2026-07-21",
    } as unknown as NodeJS.ProcessEnv);
    expect(config.usingPlaceholders).toBe(false);
    expect(config.companyName).toBe("AXON Inc.");
    expect(config.supportEmail).toBe("support@axon.example");
    expect(config.jurisdiction).toBeUndefined();
  });

  it("includes jurisdiction only when configured", () => {
    const config = getLegalConfig({
      AXON_LEGAL_COMPANY_NAME: "AXON Inc.",
      AXON_LEGAL_SUPPORT_EMAIL: "s@a.example",
      AXON_LEGAL_PRIVACY_EMAIL: "p@a.example",
      AXON_LEGAL_EFFECTIVE_DATE: "2026-07-21",
      AXON_LEGAL_JURISDICTION: "Delaware, USA",
    } as unknown as NodeJS.ProcessEnv);
    expect(config.jurisdiction).toBe("Delaware, USA");
  });
});
