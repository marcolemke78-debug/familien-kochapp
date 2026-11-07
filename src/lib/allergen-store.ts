// Datenzugriff auf D1 für Allergie-Profile (Spec 06).
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { AllergenMode, AllergenRule } from "./allergens";
import type { AllergenInput } from "./allergen-input";

type RuleRow = { id: number; user_id: number; name: string; synonyms: string; mode: AllergenMode };

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

const toRule = (r: RuleRow): AllergenRule => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  synonyms: JSON.parse(r.synonyms) as string[],
  mode: r.mode,
});

/** userId gesetzt = nur diese Person, sonst die ganze Familie */
export async function listRules(userId?: number): Promise<AllergenRule[]> {
  const database = await db();
  const query =
    userId === undefined
      ? database.prepare(`SELECT id, user_id, name, synonyms, mode FROM allergen_rules ORDER BY name COLLATE NOCASE`)
      : database.prepare(`SELECT id, user_id, name, synonyms, mode FROM allergen_rules WHERE user_id = ?1 ORDER BY name COLLATE NOCASE`).bind(userId);
  const { results } = await query.all<RuleRow>();
  return results.map(toRule);
}

export async function addRule(userId: number, input: AllergenInput): Promise<void> {
  await (await db())
    .prepare(`INSERT INTO allergen_rules (user_id, name, synonyms, mode) VALUES (?1, ?2, ?3, ?4)`)
    .bind(userId, input.name, JSON.stringify(input.synonyms), input.mode)
    .run();
}

/** Löscht nur, wenn die Regel dieser Person gehört. false = nichts gelöscht */
export async function deleteRule(ruleId: number, userId: number): Promise<boolean> {
  const result = await (await db()).prepare(`DELETE FROM allergen_rules WHERE id = ?1 AND user_id = ?2`).bind(ruleId, userId).run();
  return result.meta.changes > 0;
}
