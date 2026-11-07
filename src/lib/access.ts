// Prüft das "Armband" (JWT), das Cloudflare Access jedem angemeldeten Aufruf mitgibt.
// Reine Funktionen ohne Next.js-Abhängigkeit, damit sie sich testen lassen.
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export type AccessConfig = {
  teamDomain: string; // z. B. "meinteam.cloudflareaccess.com"
  aud: string; // Application Audience (AUD) Tag der Access-App
};

export const DEV_EMAIL = "dev@familie.test";

// Nur echte Access-Domains erlauben, damit nie Schlüssel von fremden Servern geladen werden
const TEAM_DOMAIN = /^[a-z0-9-]+\.cloudflareaccess\.com$/;

// Die öffentlichen Schlüssel pro Team einmal laden und wiederverwenden
const jwksCache = new Map<string, JWTVerifyGetKey>();

function remoteKeys(teamDomain: string): JWTVerifyGetKey {
  let keys = jwksCache.get(teamDomain);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, keys);
  }
  return keys;
}

export async function verifyAccessJwt(
  token: string | null | undefined,
  config: AccessConfig,
  getKey?: JWTVerifyGetKey,
): Promise<{ email: string } | null> {
  if (!token || !config.aud || !TEAM_DOMAIN.test(config.teamDomain)) return null;
  try {
    const { payload } = await jwtVerify(token, getKey ?? remoteKeys(config.teamDomain), {
      issuer: `https://${config.teamDomain}`,
      audience: config.aud,
    });
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    return email ? { email } : null;
  } catch {
    // Falsche Signatur, abgelaufen, falsche App: alles gleich behandeln = kein Zugang
    return null;
  }
}

// Ermittelt die E-Mail des Aufrufers. Den Test-Nutzer gibt es nur bei `next dev`.
export async function resolveEmail(input: {
  token: string | null | undefined;
  config: AccessConfig;
  nodeEnv: string | undefined;
  getKey?: JWTVerifyGetKey;
}): Promise<string | null> {
  const verified = await verifyAccessJwt(input.token, input.config, input.getKey);
  if (verified) return verified.email;
  return input.nodeEnv === "development" ? DEV_EMAIL : null;
}

export function displayNameFromEmail(email: string): string {
  // "anna.mueller85@…" -> "Anna": erster Namensteil, Ziffern am Ende weg
  const first = email.split("@")[0].split(/[._-]/)[0].replace(/\d+$/, "") || email.split("@")[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}
