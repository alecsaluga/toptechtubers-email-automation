import { NextRequest, NextResponse } from "next/server";
import { getSecret, setSecret } from "@/lib/secrets";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { writeAuditEntry } from "@/lib/audit";

// Already gated by the proxy (requires a valid session to reach this route
// at all), but also requires the current password as defense in depth --
// e.g. against a hijacked but not-yet-expired session cookie.
export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  const storedHash = await getSecret("APP_PASSWORD_HASH");
  if (!storedHash || !verifyPassword(currentPassword, storedHash)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  await setSecret("APP_PASSWORD_HASH", hashPassword(newPassword));
  await writeAuditEntry("Secret", "APP_PASSWORD_HASH", "update", { note: "password changed" });

  return NextResponse.json({ ok: true });
}
