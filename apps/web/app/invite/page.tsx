import { type Metadata } from "next";
import { redirect } from "next/navigation";

import { hasBetaAccess } from "@/lib/server/beta";
import { getCurrentUser } from "@/lib/server/current-user";
import { getDatabaseAsync } from "@/lib/server/db/client";
import { isCloudMode } from "@/lib/server/persistence-mode";
import { InviteForm } from "@/components/auth/invite-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Redeem invitation · AXON",
  robots: { index: false },
};

interface PageProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

function safeCallback(raw: string | undefined): string {
  return raw !== undefined && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/projects";
}

export default async function InvitePage({ searchParams }: PageProps) {
  const callbackUrl = safeCallback((await searchParams).callbackUrl);

  if (isCloudMode()) {
    const user = await getCurrentUser();
    // Must be signed in to redeem; identity comes from the session.
    if (user === null) {
      redirect(`/sign-in?callbackUrl=${encodeURIComponent("/invite")}`);
    }
    // Already has access — nothing to redeem.
    if (await hasBetaAccess(await getDatabaseAsync(), user.id)) {
      redirect(callbackUrl);
    }
  }

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-5 py-16"
    >
      <div>
        <h1 className="type-headline-lg">Redeem your invitation</h1>
        <p className="type-body-md mt-2 text-foreground-muted">
          AXON is in private beta. Enter the invitation code you were given to unlock the workspace.
        </p>
      </div>
      <InviteForm callbackUrl={callbackUrl} />
    </main>
  );
}
