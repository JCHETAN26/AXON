/**
 * Legal / trust configuration. Production must set real values via environment;
 * missing values fail production validation (see production-config.ts) so a
 * deployment can never publish fabricated company or contact information.
 *
 * Outside production, clearly-marked development placeholders are used so the
 * pages render during local work.
 */

export interface LegalConfig {
  readonly companyName: string;
  readonly supportEmail: string;
  readonly privacyEmail: string;
  readonly effectiveDate: string;
  /** Only shown when explicitly configured. */
  readonly jurisdiction?: string;
  /** True when any value is a development placeholder (never true in prod). */
  readonly usingPlaceholders: boolean;
}

const PLACEHOLDER = "[configure before launch]";

export const REQUIRED_LEGAL_ENV = [
  "AXON_LEGAL_COMPANY_NAME",
  "AXON_LEGAL_SUPPORT_EMAIL",
  "AXON_LEGAL_PRIVACY_EMAIL",
  "AXON_LEGAL_EFFECTIVE_DATE",
] as const;

export function getLegalConfig(env: NodeJS.ProcessEnv = process.env): LegalConfig {
  const companyName = env.AXON_LEGAL_COMPANY_NAME;
  const supportEmail = env.AXON_LEGAL_SUPPORT_EMAIL;
  const privacyEmail = env.AXON_LEGAL_PRIVACY_EMAIL;
  const effectiveDate = env.AXON_LEGAL_EFFECTIVE_DATE;
  const jurisdiction = env.AXON_LEGAL_JURISDICTION;

  const usingPlaceholders =
    !present(companyName) ||
    !present(supportEmail) ||
    !present(privacyEmail) ||
    !present(effectiveDate);

  return {
    companyName: present(companyName) ? companyName : `AXON (dev) ${PLACEHOLDER}`,
    supportEmail: present(supportEmail) ? supportEmail : `support@example.invalid ${PLACEHOLDER}`,
    privacyEmail: present(privacyEmail) ? privacyEmail : `privacy@example.invalid ${PLACEHOLDER}`,
    effectiveDate: present(effectiveDate) ? effectiveDate : `${PLACEHOLDER}`,
    ...(present(jurisdiction) && { jurisdiction }),
    usingPlaceholders,
  };
}

function present(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}
