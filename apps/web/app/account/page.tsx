import { eq } from "drizzle-orm";
import { type Metadata } from "next";

import { AccountActions } from "@/components/account/account-actions";
import { AccountControls } from "@/components/workspace/account-controls";
import { ProductHeader } from "@/components/workspace/product-header";
import { getCurrentUser } from "@/lib/server/current-user";
import { getDatabaseAsync } from "@/lib/server/db/client";
import { users } from "@/lib/server/db/schema";
import { getQuotaStatus } from "@/lib/server/generation-quota";
import { guardProductPage } from "@/lib/server/page-guard";
import { isCloudMode } from "@/lib/server/persistence-mode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account · AXON",
  robots: { index: false },
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-t-2 border-border py-3 sm:flex-row sm:items-baseline sm:justify-between">
      <dt className="type-label-caps text-foreground-muted">{label}</dt>
      <dd className="type-body-md break-words">{value}</dd>
    </div>
  );
}

export default async function AccountPage() {
  await guardProductPage("/account");

  // Local mode has no accounts.
  if (!isCloudMode()) {
    return (
      <>
        <ProductHeader account={<AccountControls />} />
        <main id="main" className="mx-auto max-w-3xl px-5 py-12 md:px-8">
          <h1 className="type-headline-lg">Account</h1>
          <p className="type-body-md mt-3 text-foreground-muted">
            AXON is running in local mode. Projects are stored in this browser and there is no
            account to manage.
          </p>
        </main>
      </>
    );
  }

  const user = await getCurrentUser();
  const db = await getDatabaseAsync();
  const rows =
    user === null
      ? []
      : await db
          .select({ name: users.name, email: users.email, createdAt: users.createdAt })
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);
  const profile = rows[0];
  const quota = user === null ? null : await getQuotaStatus(db, user.id);

  return (
    <>
      <ProductHeader account={<AccountControls />} />
      <main id="main" className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        <h1 className="type-headline-lg">Account</h1>
        <p className="type-body-md mt-2 text-foreground-muted">
          Your AXON private-beta account. Identity is managed by GitHub — AXON does not edit it.
        </p>

        <section aria-label="Account details" className="mt-8">
          <dl>
            <Row label="Signed in as" value={profile?.name ?? user?.email ?? "GitHub user"} />
            {profile?.email != null && <Row label="Email" value={profile.email} />}
            <Row label="Private beta" value="Active — invitation redeemed" />
            {profile?.createdAt != null && (
              <Row
                label="Account created"
                value={new Date(profile.createdAt).toLocaleDateString("en-US")}
              />
            )}
            {quota !== null && (
              <Row
                label="Generation usage today"
                value={`${String(quota.used)} of ${String(quota.limit)} (${String(quota.remaining)} remaining)`}
              />
            )}
          </dl>
        </section>

        <AccountActions />
      </main>
    </>
  );
}
