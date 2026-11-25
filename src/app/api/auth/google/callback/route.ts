import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exchangeCodeForTokens, fetchGoogleUserEmail } from "@/lib/integrations/gmail/oauth";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookieState = request.cookies.get("google_oauth_state")?.value;
  const error = searchParams.get("error");

  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, request.nextUrl.origin));

  if (error) return redirectTo(`/command-center?error=${encodeURIComponent(error)}`);
  if (!code || !state || state !== cookieState) {
    return redirectTo("/command-center?error=invalid_state");
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Shouldn't happen -- buildGoogleAuthUrl sets prompt=consent specifically
      // to force Google to issue one every time.
      return redirectTo("/command-center?error=no_refresh_token");
    }

    const email = await fetchGoogleUserEmail(tokens.access_token);
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Only one Gmail account is ever meant to be connected at a time (the
    // shared TTT inbox) -- connecting a different account here replaces
    // whatever was connected before, rather than leaving both rows around
    // for downstream findFirst() lookups to pick between ambiguously.
    await prisma.$transaction([
      prisma.googleAccount.deleteMany({ where: { email: { not: email } } }),
      prisma.googleAccount.upsert({
        where: { email },
        update: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt,
          scope: tokens.scope,
        },
        create: {
          email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt,
          scope: tokens.scope,
        },
      }),
    ]);

    return redirectTo("/command-center?connected=1");
  } catch (err) {
    console.error("Google OAuth callback failed", err);
    return redirectTo("/command-center?error=exchange_failed");
  }
}
