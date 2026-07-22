import { type Metadata } from "next";

import { AccountControls } from "@/components/workspace/account-controls";
import { ProductHeader } from "@/components/workspace/product-header";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { guardProductPage } from "@/lib/server/page-guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false },
};

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  await guardProductPage(`/projects/${projectId}`);
  return (
    <>
      <ProductHeader account={<AccountControls />} />
      <main id="main" className="mx-auto max-w-7xl px-5 py-12 md:px-8">
        <WorkspaceShell projectId={projectId} />
      </main>
    </>
  );
}
