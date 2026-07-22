import { buttonClasses } from "@axon/ui";
import { type Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account deleted · AXON",
  robots: { index: false },
};

export default function AccountDeletedPage() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-5 py-16"
    >
      <h1 className="type-headline-lg">Your account was deleted</h1>
      <p className="type-body-md text-foreground-muted">
        Your AXON account and its saved architecture data have been permanently removed and you have
        been signed out. This did not change any deployed infrastructure. If you were sent a beta
        invitation, it can no longer be used.
      </p>
      <Link href="/" className={buttonClasses("secondary", "md", "self-start")}>
        Back to home
      </Link>
    </main>
  );
}
