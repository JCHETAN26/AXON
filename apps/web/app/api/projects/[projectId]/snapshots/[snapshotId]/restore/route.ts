import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { SnapshotService } from "@/lib/server/snapshots/snapshot-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string; snapshotId: string }> }
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId, snapshotId } = await params;
  if (!projectId || !snapshotId) return new NextResponse("Bad Request", { status: 400 });

  const service = new SnapshotService(ctx.db, ctx.user.id);

  try {
    const newVersion = await service.restoreSnapshot(projectId, snapshotId);
    return NextResponse.json({ success: true, restoredVersion: newVersion });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Restore failed";
    return new NextResponse(msg, { status: 400 });
  }
}
