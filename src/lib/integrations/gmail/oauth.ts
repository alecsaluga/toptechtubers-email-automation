import { requireSecret } from "@/lib/secrets";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// Read-only + label-modify + send. Send is requested up front so a future
// pathway (good_opportunity/imp/agency replies) doesn't need a re-auth --
// but nothing calls gmail.send unless that pathway's PathwayConfig is live.
// spreadsheets.readonly is for the live rate-card pull (see
// src/lib/integrations/sheets/client.ts) -- an existing connected account
// won't have it until it's disconnected and reconnected once this scope is
// live, since Google only grants newly-added scopes at consent time.
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
].join(" ");

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are looked up via getSecret, which
// checks the encrypted DB-stored value first (set via the Command Center)
// and falls back to the env var of the same name -- see src/lib/secrets.ts.
// GOOGLE_REDIRECT_URI stays env-only: it must exactly match the Google Cloud
// OAuth client config and isn't something a client should self-edit.
export async function buildGoogleAuthUrl(state: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: await requireSecret("GOOGLE_CLIENT_ID"),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
    response_type: "code",
    access_type: "offline",
    prompt: "consent", // forces a refresh_token even on repeat connects
    scope: GOOGLE_SCOPES,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const [clientId, clientSecret] = await Promise.all([
    requireSecret("GOOGLE_CLIENT_ID"),
    requireSecret("GOOGLE_CLIENT_SECRET"),
  ]);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: requireEnv("GOOGLE_REDIRECT_URI"),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const [clientId, clientSecret] = await Promise.all([
    requireSecret("GOOGLE_CLIENT_ID"),
    requireSecret("GOOGLE_CLIENT_SECRET"),
  ]);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function fetchGoogleUserEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch Google userinfo: ${res.status}`);
  const data = await res.json();
  return data.email;
}
