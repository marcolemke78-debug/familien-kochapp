// Spec 07: Nährwerte pro Portion. Reine Logik ohne Datenbank.
// Werte je 100 g kommen aus dem BLS 4.0 (Max Rubner-Institut, CC BY 4.0), die Zuordnung aus ingredient_nutrition.
import { ingredientKey, termForms, tokenize } from "./allergens";
import type { Ingredient } from "./ingredients";

export type NutrientValues = { kcal: number; protein: number; fat: number; carbs: number; sugar: number };

export type NutritionMapping = {
  blsCode: string | null;
  skip: boolean; // "nicht mitrechnen" (Wasser, Salz nach Geschmack)
  grams: Record<string, number>; // Gramm je Einheit, Schlüssel aus unitKey()
  food: NutrientValues | null; // Werte je 100 g des BLS-Eintrags
};

export type NutritionResult = {
  perServing: NutrientValues;
  missing: string[]; // Zutaten, die (noch) nicht gerechnet werden können
  complete: boolean;
  mapped: number; // Zutaten mit gespeicherter Zuordnung
};

export const LOW_CARB_MAX_CARBS = 20; // g pro Portion, mit Marco festgelegt (Spec 07)

const NUTRIENTS = ["kcal", "protein", "fat", "carbs", "sugar"] as const;
const FIXED_GRAMS: Record<string, number> = { g: 1, mg: 0.001, kg: 1000 };
const ML: Record<string, number> = { ml: 1, cl: 10, dl: 100, l: 1000 };
const PIECE = new Set(["", "stk", "stuck", "stück"]);

/** Schlüssel für "Gramm je Einheit": "" = Stück, "ml" für alle Volumen, sonst die Einheit klein */
export function unitKey(unit: string | null): string {
  const u = (unit ?? "").toLowerCase().replace(/\.$/, "");
  if (PIECE.has(u)) return "";
  if (u in ML) return "ml";
  return u;
}

/** Menge in Gramm, oder null, wenn Menge oder Umrechnung fehlt. Spanne "2–3" = Mittelwert. */
export function ingredientGrams(ingredient: Ingredient, grams: Record<string, number>): number | null {
  if (ingredient.quantity === null) return null;
  const amount = ingredient.quantityMax === null ? ingredient.quantity : (ingredient.quantity + ingredient.quantityMax) / 2;
  const u = (ingredient.unit ?? "").toLowerCase();
  if (u in FIXED_GRAMS) return amount * FIXED_GRAMS[u];
  const perUnit = grams[unitKey(ingredient.unit)];
  if (perUnit === undefined || !(perUnit > 0)) return null;
  return u in ML ? amount * ML[u] * perUnit : amount * perUnit;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function computeNutrition(ingredients: Ingredient[], mappings: Map<string, NutritionMapping>, servings: number): NutritionResult {
  const total: NutrientValues = { kcal: 0, protein: 0, fat: 0, carbs: 0, sugar: 0 };
  const missing: string[] = [];
  let mapped = 0;
  let counted = 0;
  for (const ing of ingredients) {
    if (ing.heading) continue;
    counted++;
    const m = mappings.get(ingredientKey(ing.name));
    if (m) mapped++;
    if (m?.skip) continue;
    const g = m?.food ? ingredientGrams(ing, m.grams) : null;
    if (!m?.food || g === null) {
      missing.push(ing.name);
      continue;
    }
    for (const n of NUTRIENTS) total[n] += (m.food[n] * g) / 100;
  }
  const portions = servings > 0 ? servings : 1;
  const perServing = Object.fromEntries(NUTRIENTS.map((n) => [n, round1(total[n] / portions)])) as NutrientValues;
  return { perServing, missing, complete: counted > 0 && missing.length === 0, mapped };
}

export function isLowCarb(result: NutritionResult): boolean {
  return result.complete && result.perServing.carbs <= LOW_CARB_MAX_CARBS;
}

// Wörter, die bei der Suche nur stören
const STOPWORDS = new Set(["mit", "und", "oder", "von", "aus", "fur", "der", "die", "das", "ein", "eine", "etwa", "nach", "geschmack", "zum", "zur", "frisch", "frische", "klein", "gross", "evtl"]);
const MIN_FRAGMENT = 4;
const MIN_SPLIT_LENGTH = 7; // ab dieser Länge auch Wortanfänge/-enden suchen (zusammengesetzte Wörter)

function tokenFragments(token: string): string[] {
  const out = new Set(termForms(token).filter((f) => f.length >= MIN_FRAGMENT || f === token));
  if (token.length >= MIN_SPLIT_LENGTH) {
    for (let len = MIN_FRAGMENT; len < token.length; len++) {
      out.add(token.slice(0, len)); // Wortanfang ("Dinkel…")
      out.add(token.slice(-len)); // Wortende = Grundwort ("…mehl")
    }
  }
  return [...out];
}

function searchTokens(name: string): string[] {
  return tokenize(name).filter((t) => t.length >= 3 && !/^\d+$/.test(t) && !STOPWORDS.has(t));
}

/** Suchbegriffe für die BLS-Suche (SQL LIKE auf bls_foods.search ohne Leerzeichen) */
export function searchFragments(name: string): string[] {
  return [...new Set(searchTokens(name).flatMap(tokenFragments))];
}

export type BlsRow = { code: string; name: string; search: string };

/**
 * Sortiert BLS-Treffer: je Wort zählt der längste gefundene Wortteil (Anteil am Wort),
 * bei Gleichstand gewinnt der kürzere, allgemeinere Name. Ohne Treffer fällt ein Eintrag weg.
 */
export function rankCandidates<T extends BlsRow>(name: string, rows: T[], limit = 20): T[] {
  const tokens = searchTokens(name).map((t) => ({ t, forms: new Set(termForms(t)), fragments: tokenFragments(t) }));
  return rows
    .map((row) => {
      const compact = row.search.replaceAll(" ", ""); // "Hafer Flocken" ↔ "Haferflocken"
      const firstWord = row.search.split(" ")[0];
      const head = tokenize(row.name.split(",")[0]).join(""); // Name bis zum ersten Komma, ohne Leerzeichen
      let score = 0;
      for (const { t, forms, fragments } of tokens) {
        // Einzahl/Mehrzahl gilt als ganzes Wort, sonst zählt der Anteil des längsten Wortteils
        const best = Math.max(0, ...fragments.filter((f) => compact.includes(f)).map((f) => (forms.has(f) ? t.length : f.length)));
        score += Math.min(best, t.length) / t.length;
        // Der BLS nennt das Grundlebensmittel zuerst: Bonus, wenn der Name damit beginnt ("Milch fettarm" vor "Buttermilch"),
        // noch mehr, wenn das erste Wort bzw. der Teil vor dem Komma genau die Zutat ist ("Hafer Flocken")
        if ([...forms].some((f) => compact.startsWith(f))) score += 0.5;
        if (forms.has(firstWord) || forms.has(head)) score += 0.5;
      }
      return { row, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.row.name.length - b.row.name.length)
    .slice(0, limit)
    .map((x) => x.row);
}
