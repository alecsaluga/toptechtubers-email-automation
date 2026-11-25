import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/integrations/gmail/oauth";

export async function GET(request: NextRequest) {
  let url: string;
  try {
    const state = randomUUID();
    url = await buildGoogleAuthUrl(state);
    const res = NextResponse.redirect(url);
    res.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.redirect(new URL("/command-center?error=not_configured", request.nextUrl.origin));
  }
}
