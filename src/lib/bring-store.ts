// Spec 08: Export-Adressen für Bring in D1
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { EXPORT_MINUTES, newExportToken } from "./bring";

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

/** Legt eine neue Export-Adresse an und räumt dabei abgelaufene weg */
export async function createExport(recipeId: number): Promise<string> {
  const database = await db();
  const token = newExportToken();
  await database.batch([
    database.prepare(`DELETE FROM bring_exports WHERE expires_at <= datetime('now')`),
    database
      .prepare(`INSERT INTO bring_exports (token, recipe_id, expires_at) VALUES (?1, ?2, datetime('now', ?3))`)
      .bind(token, recipeId, `+${EXPORT_MINUTES} minutes`),
  ]);
  return token;
}

/** Rezept-ID zur Export-Adresse, null wenn unbekannt oder abgelaufen */
export async function findExport(token: string): Promise<number | null> {
  const row = await (
    await db()
  )
    .prepare(`SELECT recipe_id FROM bring_exports WHERE token = ?1 AND expires_at > datetime('now')`)
    .bind(token)
    .first<{ recipe_id: number }>();
  return row?.recipe_id ?? null;
}
