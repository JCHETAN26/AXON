import Link from "next/link";
import { notFound } from "next/navigation";

import { renderArchitectureSvg } from "@/lib/canvas/export-svg";
import { ShareLinkService } from "@/lib/server/collaboration/share-link-service";
import { getDatabaseAsync } from "@/lib/server/db/client";

export default async function SharedProjectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = await getDatabaseAsync();
  const shared = await new ShareLinkService(db, "public-share-resolver").resolveSharedProject(
    token,
  );
  if (shared === null) notFound();

  const svg = renderArchitectureSvg(shared.document);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
      <header className="border-b-2 border-border pb-5">
        <p className="type-label-caps text-foreground-muted">Shared Architecture</p>
        <h1 className="type-headline-lg mt-2">{shared.projectName}</h1>
        <p className="type-mono-data mt-3 text-foreground-muted">
          READ_ONLY · {shared.role.toUpperCase()} LINK · schema v{shared.document.schemaVersion}
        </p>
      </header>

      <section
        className="overflow-auto border-2 border-border-strong bg-surface p-4"
        aria-label={`${shared.projectName} shared architecture diagram`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="border-2 border-border bg-surface p-4">
          <p className="type-label-caps text-foreground-muted">Services</p>
          <p className="type-headline-md mt-2">{shared.document.nodes.length}</p>
        </div>
        <div className="border-2 border-border bg-surface p-4">
          <p className="type-label-caps text-foreground-muted">Connections</p>
          <p className="type-headline-md mt-2">{shared.document.edges.length}</p>
        </div>
        <div className="border-2 border-border bg-surface p-4">
          <p className="type-label-caps text-foreground-muted">Groups</p>
          <p className="type-headline-md mt-2">{shared.document.groups.length}</p>
        </div>
      </section>

      <footer className="border-t-2 border-border pt-5">
        <Link href="/" className="type-label-caps text-foreground-muted hover:text-foreground">
          AXON
        </Link>
      </footer>
    </main>
  );
}
