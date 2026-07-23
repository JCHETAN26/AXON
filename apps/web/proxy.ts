import { type NextRequest, NextResponse } from "next/server";

import { edgeAuth } from "@/lib/server/auth-edge";
import { isSafeRedirect } from "@/lib/server/auth-helpers";

/**
 * Protects product routes in cloud mode by requiring a valid authenticated
 * session. Marketing routes, auth pages, and the auth/health API stay public.
 * Beta-access enforcement (which needs the database) happens downstream in the
 * page guard and API routes; this layer only ensures a session exists.
 *
 * In local mode there are no accounts, so the export is a trivial passthrough
 * and the JWT session is never decoded — local requests pay no auth cost.
 */
const CLOUD = process.env.AXON_PERSISTENCE_MODE === "cloud";

const PROTECTED_PREFIXES = ["/projects", "/settings"];
const PUBLIC_PREFIXES = ["/sign-in", "/invite", "/api/auth", "/api/health", "/api/ready"];

const cloudProxy = edgeAuth((request) => {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isPublic = PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected || isPublic) return NextResponse.next();

  if (request.auth?.user?.id !== undefined) return NextResponse.next();

  const signIn = new URL("/sign-in", request.nextUrl.origin);
  const callback = pathname + request.nextUrl.search;
  if (isSafeRedirect(callback, request.nextUrl.origin)) {
    signIn.searchParams.set("callbackUrl", callback);
  }
  return NextResponse.redirect(signIn);
});

const localProxy = () => NextResponse.next();

export default (CLOUD ? cloudProxy : localProxy) as (
  request: NextRequest,
) => Response | Promise<Response>;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
