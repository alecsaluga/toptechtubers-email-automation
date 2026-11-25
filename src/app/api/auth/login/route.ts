import { NextRequest, NextResponse } from "next/server";
import { getSecret } from "@/lib/secrets";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionCookieValue, SESSION_COOKIE_NAME } from "@/lib/auth/session";

// Fixed delay on every failed attempt -- a modest brute-force speed bump.
// This is not a substitute for a strong password (see the 12-char random
// initial password); there's no distributed rate limiter here since the app
// runs as stateless serverless functions with no shared request counter.
const FAILED_ATTEMPT_DELAY_MS = 800;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  const storedHash = await getSecret("APP_PASSWORD_HASH");
  if (!storedHash) {
    return NextResponse.json({ error: "No password has been configured yet." }, { status: 500 });
  }

  const ok = password.length > 0 && verifyPassword(password, storedHash);
  if (!ok) {
    await new Promise((resolve) => setTimeout(resolve, FAILED_ATTEMPT_DELAY_MS));
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, createSessionCookieValue(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
