// Datenzugriff auf D1 für Nährwerte (Spec 07): BLS-Suche und Zuordnungen je Zutatenname.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Ingredient } from "./ingredients";
import { rankCandidates, searchFragments, type BlsRow, type NutrientValues, type NutritionMapping } from "./nutrition";

async function db() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

type MappingRow = { ingredient_key: string; bls_code: string | null; skip: number; grams: string; bls_name: string | null } & {
  [K in keyof NutrientValues]: number | null;
};

export type StoredMapping = NutritionMapping & { blsName: string | null };

/** Alle Zuordnungen der Familie mit den BLS-Werten (die Tabelle bleibt klein: ein Eintrag je Zutatenname) */
export async function listMappings(): Promise<Map<string, StoredMapping>> {
  const { results } = await (await db())
    .prepare(
      `SELECT n.ingredient_key, n.bls_code, n.skip, n.grams, f.name AS bls_name, f.kcal, f.protein, f.fat, f.carbs, f.sugar
       FROM ingredient_nutrition n LEFT JOIN bls_foods f ON f.code = n.bls_code`,
    )
    .all<MappingRow>();
  return new Map(
    results.map((r) => [
      r.ingredient_key,
      {
        blsCode: r.bls_code,
        blsName: r.bls_name,
        skip: r.skip === 1,
        grams: JSON.parse(r.grams) as Record<string, number>,
        food: r.kcal === null ? null : { kcal: r.kcal, protein: r.protein ?? 0, fat: r.fat ?? 0, carbs: r.carbs ?? 0, sugar: r.sugar ?? 0 },
      },
    ]),
  );
}

// D1 erlaubt höchstens 100 gebundene Parameter je Anfrage
const MAX_FRAGMENTS = 60;

/** Bis zu `limit` passende BLS-Einträge je Suchtext, sortiert nach rankCandidates. Ein Datenbank-Aufruf für alle Texte. */
export async function searchBls(texts: string[], limit = 20): Promise<BlsRow[][]> {
  const database = await db();
  const fragmentsPerText = texts.map((t) => searchFragments(t).slice(0, MAX_FRAGMENTS));
  const queries = fragmentsPerText
    .filter((f) => f.length > 0)
    .map((fragments) =>
      database
        .prepare(`SELECT code, name, search FROM bls_foods WHERE ${fragments.map((_, i) => `replace(search, ' ', '') LIKE ?${i + 1}`).join(" OR ")}`)
        .bind(...fragments.map((f) => `%${f}%`)),
    );
  const results = queries.length ? await database.batch<BlsRow>(queries) : [];
  let next = 0;
  return fragmentsPerText.map((fragments, i) => (fragments.length ? rankCandidates(texts[i], results[next++].results, limit) : []));
}

/** Welche dieser Codes gibt es im BLS? */
export async function existingCodes(codes: string[]): Promise<Set<string>> {
  if (codes.length === 0) return new Set();
  const unique = [...new Set(codes)].slice(0, 100);
  const { results } = await (await db())
    .prepare(`SELECT code FROM bls_foods WHERE code IN (${unique.map((_, i) => `?${i + 1}`).join(", ")})`)
    .bind(...unique)
    .all<{ code: string }>();
  return new Set(results.map((r) => r.code));
}

export type MappingInput = { key: string; blsCode: string | null; skip: boolean; grams: Record<string, number> };

/** Legt an oder ersetzt. Gilt für die ganze Familie, updated_by nur zur Nachvollziehbarkeit. */
export async function saveMappings(entries: MappingInput[], userId: number): Promise<void> {
  if (entries.length === 0) return;
  const database = await db();
  await database.batch(
    entries.map((e) =>
      database
        .prepare(
          `INSERT INTO ingredient_nutrition (ingredient_key, bls_code, skip, grams, updated_by, updated_at)
           VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'))
           ON CONFLICT (ingredient_key) DO UPDATE SET bls_code = ?2, skip = ?3, grams = ?4, updated_by = ?5, updated_at = datetime('now')`,
        )
        .bind(e.key, e.skip ? null : e.blsCode, e.skip ? 1 : 0, JSON.stringify(e.grams), userId),
    ),
  );
}

/** Zutaten aller Rezepte mit Menge und Einheit, für den Low-Carb-Filter der Rezeptliste */
export async function listIngredientsForNutrition(): Promise<Map<number, Ingredient[]>> {
  const { results } = await (await db())
    .prepare(`SELECT recipe_id, quantity, quantity_max, unit, name FROM ingredients WHERE is_heading = 0 ORDER BY recipe_id, position`)
    .all<{ recipe_id: number; quantity: number | null; quantity_max: number | null; unit: string | null; name: string }>();
  const byRecipe = new Map<number, Ingredient[]>();
  for (const r of results) {
    const list = byRecipe.get(r.recipe_id) ?? [];
    list.push({ quantity: r.quantity, quantityMax: r.quantity_max, unit: r.unit, name: r.name });
    byRecipe.set(r.recipe_id, list);
  }
  return byRecipe;
}
