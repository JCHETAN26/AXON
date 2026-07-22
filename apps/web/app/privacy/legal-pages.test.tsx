import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DataHandlingPage from "@/app/data-handling/page";
import PrivacyPage from "@/app/privacy/page";
import SecurityPage from "@/app/security/page";
import TermsPage from "@/app/terms/page";

// Affirmative compliance/marketing claims that must never appear unless
// verified. These match positive assertions only — the pages are allowed to
// honestly state what AXON does NOT claim (e.g. "claims no SOC 2").
const FORBIDDEN_CLAIMS = [
  /\bSOC ?2[- ]?(compliant|certified)/i,
  /\bISO ?27001[- ]?(compliant|certified)/i,
  /\bHIPAA[- ]?compliant/i,
  /\bGDPR[- ]?(compliant|certified)/i,
  /\bwe (use|provide|offer) end-to-end encryption/i,
  /\bimmediately (deletes?|removes?) .* from (all )?backups\b/i,
];

const PAGES: [string, () => React.ReactElement][] = [
  ["Privacy", () => <PrivacyPage />],
  ["Terms", () => <TermsPage />],
  ["Security", () => <SecurityPage />],
  ["Data Handling", () => <DataHandlingPage />],
];

describe("legal/trust pages", () => {
  for (const [name, Page] of PAGES) {
    it(`${name} renders with one heading and no unsupported compliance claims`, () => {
      const { container, unmount } = render(<Page />);
      // Exactly one top-level page heading.
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      const text = container.textContent ?? "";
      for (const pattern of FORBIDDEN_CLAIMS) {
        expect(text, `${name} must not claim ${String(pattern)}`).not.toMatch(pattern);
      }
      unmount();
    });
  }

  it("Privacy states essential-cookie-only and no data sale", () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/essential authentication cookies only/i)).toBeInTheDocument();
    expect(screen.getByText(/does not sell personal data/i)).toBeInTheDocument();
  });

  it("Terms states recommendations change the AXON document only", () => {
    render(<TermsPage />);
    expect(screen.getByText(/never changes deployed infrastructure/i)).toBeInTheDocument();
  });

  it("Data Handling documents retention and backup honesty", () => {
    render(<DataHandlingPage />);
    expect(screen.getByText(/Deleting your account permanently removes/i)).toBeInTheDocument();
    expect(
      screen.getByText(/does not claim that deleted data is immediately removed/i),
    ).toBeInTheDocument();
  });
});
