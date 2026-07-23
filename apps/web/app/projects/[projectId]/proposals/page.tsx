import { notFound } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { getDatabaseAsync } from "@/lib/server/db/client";
import { architectureProposals } from "@/lib/server/db/schema";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";

export default async function ProposalsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return notFound();
  
  const db = await getDatabaseAsync();
  const { projectId } = await params;

  const proposals = await db.select().from(architectureProposals).where(
    and(
      eq(architectureProposals.projectId, projectId),
      eq(architectureProposals.ownerId, ctx.user.id)
    )
  );

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Architecture Proposals</h1>
      {proposals.length === 0 ? (
        <p className="text-gray-500">No proposals available for this project.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {proposals.map(p => (
            <li key={p.id} className="border rounded p-4">
              <h2 className="font-semibold text-lg">Proposal {p.id.slice(0, 8)}</h2>
              <p>Status: {p.status}</p>
              <p>Commit: {p.sourceCommitSha.slice(0, 7)}</p>
              <p className="mt-2 text-sm text-gray-600">Created: {p.createdAt.toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
