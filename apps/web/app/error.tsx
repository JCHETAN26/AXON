"use client";

import { buttonClasses } from "@axon/ui";
import Link from "next/link";
import { useEffect } from "react";

/**
 * Product-level error boundary. Shows a safe, recoverable message — never a
 * stack trace, database detail, provider body, or token. Offers retry and safe
 * navigation. A reference digest is shown only if Next provides one.
 */
export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side visibility only; server logging is handled server-side and
    // never includes sensitive request content.
    console.error("A product error occurred.");
  }, [error]);

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 px-5 py-16"
    >
      <h1 className="type-headline-lg">Something went wrong</h1>
      <p className="type-body-md text-foreground-muted">
        AXON hit an unexpected error. Your saved work is unaffected. You can try again, or head back
        to your projects.
      </p>
      {error.digest !== undefined && (
        <p className="type-mono-data text-foreground-muted">Reference: {error.digest}</p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={reset} className={buttonClasses("primary", "md")}>
          Try again
        </button>
        <Link href="/projects" className={buttonClasses("secondary", "md")}>
          Back to projects
        </Link>
        <Link href="/" className={buttonClasses("secondary", "md")}>
          Home
        </Link>
      </div>
    </main>
  );
}
