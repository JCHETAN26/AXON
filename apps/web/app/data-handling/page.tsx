import { type Metadata } from "next";

import { LegalSection, LegalShell } from "@/components/legal/legal-shell";

export const metadata: Metadata = { title: "Data Handling · AXON" };

export default function DataHandlingPage() {
  return (
    <LegalShell
      title="Data handling"
      intro="AXON distinguishes carefully between the different kinds of information it works with, and what it does and does not retain."
    >
      <LegalSection heading="Evidence boundaries">
        <p>Every value AXON shows you is attributed to its source:</p>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>User-entered architecture — what you drew or typed.</li>
          <li>Imported configuration — from a supplied Docker Compose file.</li>
          <li>Generated content — drafts produced by an AI provider from your prompt.</li>
          <li>AXON default assumptions — used when you supply no value.</li>
          <li>Deterministic calculations — audit and simulation results derived from the model.</li>
          <li>AI inference — clearly labelled where present.</li>
        </ul>
      </LegalSection>
      <LegalSection heading="What is stored with your account">
        <p>
          Your projects, architecture documents, audits, recommendations, simulation profiles and
          latest runs, and Compose import drafts are stored server-side, scoped to your account.
        </p>
      </LegalSection>
      <LegalSection heading="GitHub repository analysis">
        <p>
          If you connect repositories through the AXON GitHub App, analysis is static and bounded —
          AXON never executes your code, installs dependencies, or runs Docker, Terraform, or
          Kubernetes tooling. It reads only the supported files it needs and stores structured
          <em> evidence</em> (technology names, file paths, and safe redacted excerpts) plus the
          proposals derived from them. Raw source files are not stored, and secret values are
          redacted — only secret-reference names are ever kept.
        </p>
        <p>
          Short-lived GitHub installation tokens are minted server-side per request and are never
          stored; the GitHub App private key is server-only. Disconnecting a repository removes its
          analysis runs, evidence, and proposals while preserving any architecture you already
          applied. Account deletion removes all of it.
        </p>
      </LegalSection>
      <LegalSection heading="Feedback">
        <p>
          Feedback is stored with your account identity and a category. It is not attached to any
          project and never carries architecture content or Compose source.
        </p>
      </LegalSection>
      <LegalSection heading="What is not attached automatically">
        <p>
          Feedback is never linked to a project. Exports never include raw Docker Compose source,
          imported secret-like values, authentication tokens, sessions, or another user&apos;s data.
        </p>
      </LegalSection>
      <LegalSection heading="Retention">
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>Projects and artifacts are retained until you delete the project or your account.</li>
          <li>
            Deleting a project removes its architecture and project-scoped artifacts, including any
            Compose import draft.
          </li>
          <li>
            Deleting your account permanently removes your projects, documents, audits,
            recommendations, simulations, and import drafts, in a single transaction.
          </li>
          <li>
            Redeemed invitations are retained with your identity removed, for abuse prevention.
          </li>
          <li>
            Generation-usage counters are per-day rate-limit records; they are removed with your
            account.
          </li>
          <li>
            Browser-local projects (local mode) live only in your browser and are never sent to a
            server unless you explicitly migrate them.
          </li>
          <li>
            Session-recovery records live in your browser&apos;s session storage and expire within
            24 hours.
          </li>
        </ul>
      </LegalSection>
      <LegalSection heading="Database backups">
        <p>
          Backup configuration is an operator responsibility for the deployed environment. AXON does
          not claim that deleted data is immediately removed from any backups; where backups are
          configured, deleted records may persist in them until those backups age out per the
          operator&apos;s retention schedule.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
