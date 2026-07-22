import { type Metadata } from "next";

import { AccountControls } from "@/components/workspace/account-controls";
import { NewProjectForm } from "@/components/workspace/new-project-form";
import { ProductHeader } from "@/components/workspace/product-header";
import { guardProductPage } from "@/lib/server/page-guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New Project",
  robots: { index: false },
};

export default async function NewProjectPage() {
  await guardProductPage("/projects/new");
  return (
    <>
      <ProductHeader account={<AccountControls />} />
      <main id="main" className="mx-auto max-w-5xl px-5 py-12 md:px-8">
        <h1 className="type-headline-lg">New Project</h1>
        <p className="type-body-md mt-2 max-w-xl text-foreground-muted">
          Name the system you are designing. You can start blank or from the sample reference
          architecture.
        </p>
        <div className="mt-10">
          <NewProjectForm />
        </div>
      </main>
    </>
  );
}
