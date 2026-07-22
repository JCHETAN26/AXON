import { type Metadata } from "next";

import { LegalSection, LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Security · AXON" };

export default function SecurityPage() {
  return (
    <LegalShell
      title="Security & trust"
      intro="What AXON does to protect your account and data during the private beta, and — just as importantly — what it does not claim."
    >
      <LegalSection heading="Implemented safeguards">
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>Sign-in through GitHub OAuth with identity scopes only; no repository access.</li>
          <li>Invite-only access — signing in does not by itself grant beta access.</li>
          <li>Projects are owner-scoped; server-side authorization on every request.</li>
          <li>Cross-user resources return not-found rather than revealing they exist.</li>
          <li>Optimistic concurrency prevents silent overwrites of your saved architecture.</li>
          <li>Secret-like values in Docker Compose imports are not read or stored as content.</li>
          <li>AXON never executes infrastructure; recommendations require explicit approval.</li>
          <li>Security headers (including a Content Security Policy) on every response.</li>
          <li>Production configuration fails closed if misconfigured.</li>
          <li>You can export and permanently delete your data.</li>
        </ul>
      </LegalSection>
      <LegalSection heading="Limitations we are honest about">
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>This is a beta with no formal security certification.</li>
          <li>There is no live cloud-account integration and no runtime verification.</li>
          <li>Simulations are estimates and are not production benchmarks.</li>
          <li>AI-generated and inferred output requires your review.</li>
        </ul>
      </LegalSection>
      <LegalSection heading="Reporting an issue">
        <p>
          If you believe you have found a security issue, please contact us through the support
          address on the Terms page before disclosing it publicly.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
