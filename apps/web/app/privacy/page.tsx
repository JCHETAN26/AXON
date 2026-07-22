import { type Metadata } from "next";

import { LegalSection, LegalShell } from "@/components/legal/legal-shell";
import { getLegalConfig } from "@/lib/legal-config";

export const metadata: Metadata = { title: "Privacy · AXON" };

export default function PrivacyPage() {
  const legal = getLegalConfig();
  return (
    <LegalShell
      title="Privacy"
      intro="AXON is a private-beta product. This page describes what data AXON collects and how it is used, in plain terms."
    >
      <LegalSection heading="Account data we collect">
        <p>
          You sign in with GitHub. AXON stores the identity GitHub provides — your GitHub display
          name and, where available, your email — to identify your account. AXON requests only
          identity scopes and never requests repository access.
        </p>
      </LegalSection>
      <LegalSection heading="Project and architecture data">
        <p>
          Architecture documents, audits, recommendations, simulations, and Docker Compose import
          drafts you create are stored, scoped to your account, in AXON&apos;s PostgreSQL database.
          They are visible only to you.
        </p>
      </LegalSection>
      <LegalSection heading="AI generation">
        <p>
          When you generate an architecture from a prompt, the prompt is sent to a third-party AI
          provider to produce a draft. AXON does not control that provider&apos;s independent data
          handling and makes no zero-retention claim on its behalf.
        </p>
      </LegalSection>
      <LegalSection heading="Feedback">
        <p>
          Feedback you submit is stored with your account identity. Feedback is never linked to a
          specific project and never contains your architecture content or Compose source.
        </p>
      </LegalSection>
      <LegalSection heading="Cookies">
        <p>
          AXON uses essential authentication cookies only. There are no advertising cookies and no
          third-party analytics. Signing out clears your authenticated access.
        </p>
      </LegalSection>
      <LegalSection heading="What we do not do">
        <p>
          AXON does not sell personal data and does not give advertisers access to your data. AXON
          claims no formal compliance certification (such as SOC 2, ISO 27001, HIPAA, or GDPR
          certification) for this beta.
        </p>
      </LegalSection>
      <LegalSection heading="Your controls">
        <p>
          You can export all of your AXON data as JSON, and you can delete your account, which
          permanently removes your projects and saved architecture data. See the Data Handling page
          for retention details.
        </p>
      </LegalSection>
      <LegalSection heading="Contact">
        <p>
          Privacy questions: {legal.privacyEmail}. General support: {legal.supportEmail}.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
