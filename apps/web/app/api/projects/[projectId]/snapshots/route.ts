import { NextResponse } from "next/server";
import { resolveBetaRoute } from "@/lib/server/route-auth";
import { getCurrentUser } from "@/lib/server/current-user";
import { SnapshotService } from "@/lib/server/snapshots/snapshot-service";
import { parseArchitectureDocument } from "@axon/diagram-schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId } = await params;
  if (!projectId) return new NextResponse("Bad Request", { status: 400 });

  const service = new SnapshotService(ctx.db, ctx.user.id);
  const snapshots = await service.listSnapshots(projectId);

  return NextResponse.json({ snapshots });
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

  const { document, version, creationReason } = body as {
    document: unknown;
    version: number;
    creationReason: "user-edit" | "manual-snapshot" | "recommendation-applied";
  };

  if (!document || !version) {
    return new NextResponse("Bad Request: missing document or version", { status: 400 });
  }

  const parsedDoc = parseArchitectureDocument(document);
  const service = new SnapshotService(ctx.db, ctx.user.id);

  const snapshotId = await service.createSnapshot(
    projectId,
    parsedDoc,
    version,
    creationReason ?? "manual-snapshot"
  );

  return NextResponse.json({ snapshotId });
}
