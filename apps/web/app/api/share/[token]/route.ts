import { NextResponse } from "next/server";

import { ShareLinkService } from "@/lib/server/collaboration/share-link-service";
import { getDatabaseAsync } from "@/lib/server/db/client";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!token) return new NextResponse("Bad Request", { status: 400 });

  const db = await getDatabaseAsync();
  const shared = await new ShareLinkService(db, "public-share-resolver").resolveSharedProject(
    token,
  );
  if (shared === null) {
    return NextResponse.json({ error: "Share link not found." }, { status: 404 });
  }

  return NextResponse.json({
    project: {
      id: shared.projectId,
      name: shared.projectName,
    },
    role: shared.role,
    document: shared.document,
  });
}
