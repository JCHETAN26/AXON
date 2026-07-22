import { buttonClasses } from "@axon/ui";
import { type Metadata } from "next";
import Link from "next/link";

import { auth, signIn } from "@/lib/server/auth";
import { isTestAuthEnabled } from "@/lib/server/auth-helpers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in · AXON",
  robots: { index: false },
};

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "Could not start sign-in. Please try again.",
  OAuthCallback: "Sign-in was interrupted. Please try again.",
  OAuthAccountNotLinked: "That account is already linked to a different sign-in method.",
  AccessDenied: "Sign-in was cancelled.",
  Configuration: "Sign-in is temporarily unavailable.",
  CredentialsSignin: "Test sign-in failed.",
};

interface PageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

function safeCallback(raw: string | undefined): string {
  // Only same-origin relative paths are accepted, preventing open redirects.
  return raw !== undefined && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/projects";
}

export default async function SignInPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const callbackUrl = safeCallback(params.callbackUrl);
  const errorMessage =
    params.error !== undefined ? (ERROR_MESSAGES[params.error] ?? "Sign-in failed.") : null;

  // Already signed in — send them on.
  if ((await auth())?.user?.id !== undefined) {
    const { redirect } = await import("next/navigation");
    redirect(callbackUrl);
  }

  const signInWithGitHub = async () => {
    "use server";
    await signIn("github", { redirectTo: callbackUrl });
  };

  const signInWithTestAuth = async (formData: FormData) => {
    "use server";
    const email = formData.get("email");
    await signIn("test-auth", {
      email: typeof email === "string" && email.length > 0 ? email : "beta-tester@example.com",
      redirectTo: callbackUrl,
    });
  };

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-5 py-16"
    >
      <div>
        <Link href="/" className="font-display text-2xl font-bold tracking-tight text-foreground">
          AXON
        </Link>
        <h1 className="type-headline-lg mt-6">Sign in</h1>
        <p className="type-body-md mt-2 text-foreground-muted">
          AXON is in private beta. Sign in to continue; a beta invitation is required to access the
          workspace.
        </p>
      </div>

      {errorMessage !== null && (
        <p
          role="alert"
          className="rounded-control border-2 border-critical bg-critical-muted/40 px-3 py-2 text-critical"
        >
          {errorMessage}
        </p>
      )}

      <form action={signInWithGitHub}>
        <button type="submit" className={buttonClasses("primary", "lg", "w-full")}>
          Continue with GitHub
        </button>
      </form>

      {isTestAuthEnabled() && (
        <form
          action={signInWithTestAuth}
          className="flex flex-col gap-3 border-t-2 border-border pt-6"
        >
          <p className="type-label-caps text-foreground-muted">
            Test authentication (non-production)
          </p>
          <label htmlFor="test-email" className="sr-only">
            Test email
          </label>
          <input
            id="test-email"
            name="email"
            type="email"
            placeholder="beta-tester@example.com"
            className="type-mono-data rounded-control border-2 border-border bg-surface px-3 py-2"
          />
          <button type="submit" className={buttonClasses("secondary", "md", "w-full")}>
            Sign in as test user
          </button>
        </form>
      )}

      <p className="type-mono-data text-foreground-muted">
        <Link href="/" className="underline">
          Back to home
        </Link>
      </p>
    </main>
  );
}
