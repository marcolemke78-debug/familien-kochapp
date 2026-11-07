// Wer ruft gerade auf? Liest das Access-JWT und legt neue Familienmitglieder in D1 an.
import { cache } from "react";
import { headers } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { resolveEmail, displayNameFromEmail } from "./access";

export type User = { id: number; email: string; displayName: string };

type UserRow = { id: number; email: string; display_name: string };

// cache(): pro Seitenaufruf nur einmal prüfen, auch wenn mehrere Komponenten fragen
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { env } = await getCloudflareContext({ async: true });
  const token = (await headers()).get("cf-access-jwt-assertion");

  const email = await resolveEmail({
    token,
    config: { teamDomain: env.CF_ACCESS_TEAM_DOMAIN, aud: env.CF_ACCESS_AUD },
    nodeEnv: process.env.NODE_ENV,
  });
  if (!email) return null;

  // Upsert: erstes Login legt an, jedes weitere findet denselben Datensatz (email ist UNIQUE)
  const row = await env.DB.prepare(
    `INSERT INTO users (email, display_name) VALUES (?1, ?2)
     ON CONFLICT(email) DO UPDATE SET email = excluded.email
     RETURNING id, email, display_name`,
  )
    .bind(email, displayNameFromEmail(email))
    .first<UserRow>();

  return row ? { id: row.id, email: row.email, displayName: row.display_name } : null;
});
