import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/server/current-user";
import { ShareLinkService } from "@/lib/server/collaboration/share-link-service";
import { resolveBetaRoute } from "@/lib/server/route-auth";

const CreateShareLinkBodySchema = z.object({
  role: z.enum(["editor", "commenter", "viewer"]),
  label: z.string().trim().min(1).max(120).optional(),
  expiresAt: z.iso.datetime().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId } = await params;
  if (!projectId) return new NextResponse("Bad Request", { status: 400 });

  const shareLinks = await new ShareLinkService(ctx.db, ctx.user.id).listShareLinks(projectId);
  return NextResponse.json({ shareLinks });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const ctx = await resolveBetaRoute(getCurrentUser);
  if (ctx instanceof Response) return ctx;

  const { projectId } = await params;
  if (!projectId) return new NextResponse("Bad Request", { status: 400 });

  const parsed = CreateShareLinkBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid share-link request." }, { status: 400 });
  }

  try {
    const shareLink = await new ShareLinkService(ctx.db, ctx.user.id).createShareLink({
      projectId,
      role: parsed.data.role,
      ...(parsed.data.label !== undefined && { label: parsed.data.label }),
      ...(parsed.data.expiresAt !== undefined && { expiresAt: new Date(parsed.data.expiresAt) }),
    });
    return NextResponse.json({ shareLink }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create share link.";
    const status = /not found/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
