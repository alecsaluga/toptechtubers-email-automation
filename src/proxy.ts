import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/session";

// Paths reachable without a session cookie. Kept short and explicit rather
// than a regex -- easier to audit than to get a negative-lookahead pattern
// exactly right for a security gate.
const PUBLIC_PATHS = new Set([
  "/login",
  "/api/auth/login",
  // Hit by Vercel Cron (see vercel.json), not a browser -- it has its own
  // CRON_SECRET bearer-token check inside the route itself.
  "/api/cron/poll-gmail",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname === "/favicon.ico") return true;
  return false;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookie && verifySessionCookie(cookie)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}
