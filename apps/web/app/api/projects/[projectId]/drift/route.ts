import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { SnapshotService } from "@/lib/server/snapshots/snapshot-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId } = await params;
  if (!projectId) return new NextResponse("Bad Request", { status: 400 });

  const service = new SnapshotService(ctx.db, ctx.user.id);
  const driftItems = await service.listDriftItems(projectId);

  return NextResponse.json({ driftItems });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId } = await params;
  if (!projectId) return new NextResponse("Bad Request", { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { driftId, decision } = body as {
    driftId: string;
    decision: "accepted" | "rejected" | "acknowledged";
  };

  if (!driftId || !decision) {
    return new NextResponse("Bad Request: missing driftId or decision", { status: 400 });
  }

  const service = new SnapshotService(ctx.db, ctx.user.id);
  await service.resolveDrift(driftId, decision);

  return NextResponse.json({ success: true });
}
