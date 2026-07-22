import { buttonClasses } from "@axon/ui";
import { type Metadata } from "next";
import Link from "next/link";

import { AccountControls } from "@/components/workspace/account-controls";
import { MigrationPanel } from "@/components/workspace/migration-panel";
import { ProductHeader } from "@/components/workspace/product-header";
import { ProjectList } from "@/components/workspace/project-list";
import { guardProductPage } from "@/lib/server/page-guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects",
  robots: { index: false },
};

export default async function ProjectsPage() {
  await guardProductPage("/projects");
  return (
    <>
      <ProductHeader account={<AccountControls />} />
      <main id="main" className="mx-auto max-w-5xl px-5 py-12 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="type-headline-lg">Projects</h1>
            <p className="type-body-md mt-2 text-foreground-muted">
              Architecture documents stored locally in this browser.
            </p>
          </div>
          <Link href="/projects/new" className={buttonClasses("primary", "md")}>
            New Project
          </Link>
        </div>
        <div className="mt-8">
          <MigrationPanel />
        </div>
        <div className="mt-10">
          <ProjectList />
        </div>
      </main>
    </>
  );
}
