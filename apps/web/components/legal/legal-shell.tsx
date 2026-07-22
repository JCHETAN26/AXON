import { type ReactNode } from "react";
import Link from "next/link";

import { getLegalConfig } from "@/lib/legal-config";

/**
 * Shared shell for the public trust/legal pages. Renders a consistent heading,
 * effective date, and cross-links. Content is honest and product-specific.
 */
export function LegalShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  const legal = getLegalConfig();
  return (
    <main id="main" className="mx-auto max-w-3xl px-5 py-14 md:px-8">
      <p className="type-label-caps text-foreground-muted">
        <Link href="/" className="hover:text-foreground">
          AXON
        </Link>{" "}
        · Trust
      </p>
      <h1 className="type-headline-lg mt-3">{title}</h1>
      <p className="type-body-lg mt-3 text-foreground-muted">{intro}</p>
      <p className="type-mono-data mt-2 text-foreground-muted">
        Effective date: {legal.effectiveDate} · {legal.companyName}
        {legal.usingPlaceholders ? " · DEVELOPMENT PLACEHOLDERS — not for production" : ""}
      </p>

      <div className="mt-8 flex flex-col gap-6">{children}</div>

      <nav
        aria-label="Trust pages"
        className="mt-12 flex flex-wrap gap-4 border-t-2 border-border pt-6"
      >
        {(
          [
            ["/privacy", "Privacy"],
            ["/terms", "Terms"],
            ["/security", "Security"],
            ["/data-handling", "Data Handling"],
          ] as const
        ).map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="type-label-caps text-foreground-muted hover:text-foreground"
          >
            {label}
          </Link>
        ))}
      </nav>
    </main>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="type-headline-md">{heading}</h2>
      <div className="type-body-md mt-2 flex flex-col gap-2 text-foreground-muted">{children}</div>
    </section>
  );
}
