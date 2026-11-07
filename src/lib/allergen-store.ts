// Datenzugriff auf D1 für Allergie-Profile (Spec 06).
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { AllergenMode, AllergenRule, ApprovedSubstitution } from "./allergens";
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

/** Anzeigenamen der Familie (für "betrifft Testperson A") */
export async function listFamilyNames(): Promise<Map<number, string>> {
  const { results } = await (await db()).prepare(`SELECT id, display_name FROM users`).all<{ id: number; display_name: string }>();
  return new Map(results.map((u) => [u.id, u.display_name]));
}

/** Freigegebener Ersatz in einem Rezept (Vorschläge zählen nicht) */
export async function listApprovedSubstitutions(recipeId: number): Promise<ApprovedSubstitution[]> {
  const { results } = await (await db())
    .prepare(`SELECT ingredient_key, user_id, replacement FROM substitutions WHERE recipe_id = ?1 AND status = 'freigegeben'`)
    .bind(recipeId)
    .all<{ ingredient_key: string; user_id: number; replacement: string }>();
  return results.map((r) => ({ ingredientKey: r.ingredient_key, userId: r.user_id, replacement: r.replacement }));
}

/** Für die Badges der Rezeptliste: Zutaten (ohne Überschriften) und freigegebener Ersatz je Rezept */
export async function listAllergenData(): Promise<{
  ingredients: Map<number, { name: string; isRaw: boolean | null }[]>;
  approved: Map<number, ApprovedSubstitution[]>;
}> {
  const database = await db();
  const [ings, subs] = await database.batch([
    database.prepare(`SELECT recipe_id, name, is_raw FROM ingredients WHERE is_heading = 0`),
    database.prepare(`SELECT recipe_id, ingredient_key, user_id, replacement FROM substitutions WHERE status = 'freigegeben'`),
  ]);
  const ingredients = new Map<number, { name: string; isRaw: boolean | null }[]>();
  for (const r of ings.results as { recipe_id: number; name: string; is_raw: number | null }[]) {
    const list = ingredients.get(r.recipe_id) ?? [];
    list.push({ name: r.name, isRaw: r.is_raw === null ? null : r.is_raw === 1 });
    ingredients.set(r.recipe_id, list);
  }
  const approved = new Map<number, ApprovedSubstitution[]>();
  for (const r of subs.results as { recipe_id: number; ingredient_key: string; user_id: number; replacement: string }[]) {
    const list = approved.get(r.recipe_id) ?? [];
    list.push({ ingredientKey: r.ingredient_key, userId: r.user_id, replacement: r.replacement });
    approved.set(r.recipe_id, list);
  }
  return { ingredients, approved };
}
