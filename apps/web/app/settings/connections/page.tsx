import { type Metadata } from "next";

import { ConnectionsShell } from "@/components/settings/connections-shell";
import { AccountControls } from "@/components/workspace/account-controls";
import { ProductHeader } from "@/components/workspace/product-header";
import { isGithubAppConfigured } from "@/lib/server/github/config";
import { guardProductPage } from "@/lib/server/page-guard";
import { isCloudMode } from "@/lib/server/persistence-mode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connections · AXON",
  robots: { index: false },
};

export default async function ConnectionsPage() {
  await guardProductPage("/settings/connections");

  return (
    <>
      <ProductHeader account={<AccountControls />} />
      <main id="main" className="mx-auto max-w-3xl px-5 py-12 md:px-8">
        <h1 className="type-headline-lg">Connections</h1>
        <p className="type-body-md mt-2 max-w-prose text-foreground-muted">
          Connect GitHub repositories to build an evidence-backed architecture. AXON requests
          read-only access to only the repositories you select, never modifies them, and never runs
          their code. Analysis is static and bounded.
        </p>

        {!isCloudMode() ? (
          <p className="type-body-md mt-8 border-t-2 border-border pt-6 text-foreground-muted">
            AXON is running in local mode. Repository connections require the hosted (cloud) mode
            with an account.
          </p>
        ) : (
          <ConnectionsShell configured={isGithubAppConfigured()} />
        )}
      </main>
    </>
  );
}
