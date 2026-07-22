import { type Metadata } from "next";

import { LegalSection, LegalShell } from "@/components/legal/legal-shell";
import { getLegalConfig } from "@/lib/legal-config";

export const metadata: Metadata = { title: "Terms · AXON" };

export default function TermsPage() {
  const legal = getLegalConfig();
  return (
    <LegalShell
      title="Terms of use"
      intro="These beta terms describe how AXON may be used during the private beta. They are intentionally plain and require founder/legal review before general availability."
    >
      <LegalSection heading="Beta product">
        <p>
          AXON is provided as a private beta, as-is, without a guarantee of uptime, availability, or
          fitness for a particular purpose. Features may change or be removed.
        </p>
      </LegalSection>
      <LegalSection heading="Architecture outputs require review">
        <p>
          Generated architectures, audit findings, recommendations, and simulations are analyses of
          the architecture you represent in AXON. They may be incomplete or incorrect and must be
          reviewed by a qualified engineer before you rely on them.
        </p>
      </LegalSection>
      <LegalSection heading="What AXON changes">
        <p>
          Recommendations modify only the AXON architecture document. Applying a recommendation or
          importing a Compose file changes your AXON model — it never changes deployed
          infrastructure, source code, cloud resources, or configuration. Simulations are estimates,
          not production benchmarks. Compose imports reflect the supplied configuration, not a
          running environment.
        </p>
      </LegalSection>
      <LegalSection heading="Your responsibilities">
        <p>
          You are responsible for the confidentiality of information you enter. Do not upload
          secrets, credentials, or `.env` files. You must not abuse the service, attempt to access
          other users&apos; data, or use AXON unlawfully.
        </p>
      </LegalSection>
      <LegalSection heading="Termination">
        <p>
          Access may be suspended or terminated for abuse or at the end of the beta. You may delete
          your account at any time.
        </p>
      </LegalSection>
      <LegalSection heading="Contact">
        <p>
          {legal.companyName} · {legal.supportEmail}
          {legal.jurisdiction !== undefined
            ? ` · Governing jurisdiction: ${legal.jurisdiction}`
            : ""}
        </p>
      </LegalSection>
    </LegalShell>
  );
}
