"use server";
// Spec 07: Nährwert-Zuordnung vorbereiten (mit Claude-Vorschlägen), BLS durchsuchen, Zuordnung speichern.
// Zuordnungen gelten für die ganze Familie (je Zutatenname), darum darf jede angemeldete Person sie ändern.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getRecipe } from "@/lib/recipes";
import { formatIngredient, type Ingredient } from "@/lib/ingredients";
import { ingredientKey } from "@/lib/allergens";
import { applySubstitutions, unitKey } from "@/lib/nutrition";
import { listApprovedSubstitutions } from "@/lib/allergen-store";
import { MAX_GRAMS_PER_UNIT, type Match, type MatchItem } from "@/lib/nutrition-match";
import { existingCodes, listMappings, saveMappings, searchBls } from "@/lib/nutrition-store";
import { matchWithClaude } from "@/lib/nutrition-claude";

const NOT_LOGGED_IN = "Du bist nicht mehr angemeldet. Bitte lade die Seite neu.";
const recipeIdSchema = z.number().int().positive();
const FIXED_UNITS = new Set(["g", "mg", "kg"]);

export type BlsOption = { code: string; name: string };

// Eine Zeile im Zuordnungs-Fenster = ein Zutatenname (kommt er mehrfach vor, gilt die Zuordnung für alle Zeilen)
export type NutritionRow = {
  key: string;
  line: string; // erste Zeile mit Menge, zum Anzeigen
  units: string[]; // Schlüssel aus unitKey(), für die Gramm gebraucht werden
  unitLabels: Record<string, string>; // Schlüssel → Einheit wie im Rezept ("EL", "Stück", "ml")
  code: string | null;
  skip: boolean;
  grams: Record<string, number>;
  options: BlsOption[]; // Auswahl, der aktuelle Eintrag steht zuerst
  saved: boolean; // schon gespeicherte, vollständige Zuordnung
  suggested: boolean; // Vorschlag von Claude, noch nicht gespeichert
};

export type PrepareResult = { ok: true; rows: NutritionRow[]; aiError: string | null } | { ok: false; error: string };

function neededUnits(lines: Ingredient[]): { units: string[]; labels: Record<string, string> } {
  const labels: Record<string, string> = {};
  for (const ing of lines) {
    if (ing.quantity === null || FIXED_UNITS.has((ing.unit ?? "").toLowerCase())) continue;
    const key = unitKey(ing.unit);
    labels[key] ??= key === "" ? "Stück" : key === "ml" ? "ml" : (ing.unit ?? key);
  }
  return { units: Object.keys(labels), labels };
}

/** Zutaten so, wie gekocht wird: mit freigegebenem Ersatz (gleiche Rechnung wie auf der Rezeptseite) */
async function ingredientsWithSubstitutes(recipeId: number): Promise<Ingredient[] | null> {
  const [recipe, approved] = await Promise.all([getRecipe(recipeId), listApprovedSubstitutions(recipeId)]);
  return recipe ? applySubstitutions(recipe.ingredients, approved).ingredients : null;
}

export async function prepareNutrition(recipeId: number): Promise<PrepareResult> {
  if (!(await getCurrentUser())) return { ok: false, error: NOT_LOGGED_IN };
  if (!recipeIdSchema.safeParse(recipeId).success) return { ok: false, error: "Ungültige Angabe." };

  try {
    const [ingredients, mappings] = await Promise.all([ingredientsWithSubstitutes(recipeId), listMappings()]);
    if (!ingredients) return { ok: false, error: "Dieses Rezept gibt es nicht mehr." };

    // Zeilen je Zutatenname bündeln
    const groups = new Map<string, Ingredient[]>();
    for (const ing of ingredients) {
      if (ing.heading) continue;
      const key = ingredientKey(ing.name);
      if (!key) continue;
      groups.set(key, [...(groups.get(key) ?? []), ing]);
    }

    const rows: NutritionRow[] = [...groups].map(([key, lines]) => {
      const m = mappings.get(key);
      const { units, labels } = neededUnits(lines);
      const saved = !!m && (m.skip || (!!m.blsCode && units.every((u) => (m.grams[u] ?? 0) > 0)));
      return {
        key,
        line: formatIngredient(lines[0]),
        units,
        unitLabels: labels,
        code: m?.skip ? null : (m?.blsCode ?? null),
        skip: m?.skip ?? false,
        grams: m?.grams ?? {},
        options: m?.blsCode && m.blsName ? [{ code: m.blsCode, name: m.blsName }] : [],
        saved,
        suggested: false,
      };
    });

    // Nur für offene Zutaten: lokal suchen, dann Claude wählen lassen
    const open = rows.filter((r) => !r.saved);
    const aiError = await suggestFor(open, groups);
    return { ok: true, rows, aiError };
  } catch {
    return { ok: false, error: "Die Nährwerte konnten nicht geladen werden. Bitte versuch es noch einmal." };
  }
}

/** Füllt Vorschläge in die offenen Zeilen. Liefert eine Fehlermeldung, wenn Claude nicht helfen konnte (Suche geht trotzdem). */
async function suggestFor(open: NutritionRow[], groups: Map<string, Ingredient[]>): Promise<string | null> {
  if (open.length === 0) return null;
  const firstSearch = await searchBls(open.map((r) => groups.get(r.key)![0].name));
  open.forEach((r, i) => (r.options = mergeOptions(r.options, firstSearch[i])));

  const ask = (rows: NutritionRow[]): MatchItem[] =>
    rows.map((r) => ({
      index: open.indexOf(r),
      line: r.line,
      unit: missingUnit(r),
      candidates: r.options,
    }));
  const first = await matchWithClaude(ask(open));
  if (!first.ok) return first.error;
  apply(open, first.matches);

  // Zweite Runde nur für Zutaten, bei denen Claude einen besseren Suchbegriff genannt hat ("Eier" → "Hühnerei")
  const retry = first.matches.filter((m) => !m.code && !m.skip && m.searchTerm);
  if (retry.length > 0) {
    const secondSearch = await searchBls(retry.map((m) => m.searchTerm));
    const retryRows = retry.map((m, i) => {
      const row = open[m.index];
      row.options = mergeOptions(secondSearch[i], row.options);
      return row;
    });
    const second = await matchWithClaude(ask(retryRows));
    if (second.ok) apply(open, second.matches);
  }
  return null;
}

// Einheit, für die noch Gramm fehlen, so wie sie im Rezept steht ("EL", "Stück", "ml"). Pro Runde eine.
function missingUnit(row: NutritionRow): string | null {
  const key = row.units.find((u) => !((row.grams[u] ?? 0) > 0));
  return key === undefined ? null : row.unitLabels[key];
}

function apply(open: NutritionRow[], matches: Match[]) {
  for (const m of matches) {
    const row = open[m.index];
    if (!row) continue;
    // Schon zugeordnet (fehlt nur Gramm für eine neue Einheit): Zuordnung nicht anfassen, sie gilt für alle Rezepte
    const hasChoice = !!row.code || row.skip;
    if (!hasChoice && m.skip) {
      row.skip = true;
      row.code = null;
      row.suggested = true;
    } else if (!hasChoice && m.code) {
      row.code = m.code;
      row.suggested = true;
      // gewählten Eintrag nach vorn
      row.options = [...row.options.filter((o) => o.code === m.code), ...row.options.filter((o) => o.code !== m.code)];
    }
    const unit = row.units.find((u) => !((row.grams[u] ?? 0) > 0));
    if (unit !== undefined && m.gramsPerUnit) row.grams = { ...row.grams, [unit]: m.gramsPerUnit };
  }
}

function mergeOptions(a: BlsOption[], b: BlsOption[]): BlsOption[] {
  const seen = new Set<string>();
  return [...a, ...b].filter((o) => !seen.has(o.code) && seen.add(o.code)).map(({ code, name }) => ({ code, name }));
}

export async function searchBlsAction(query: string): Promise<BlsOption[]> {
  if (!(await getCurrentUser())) return [];
  const q = typeof query === "string" ? query.trim().slice(0, 60) : "";
  if (q.length < 3) return [];
  try {
    const [rows] = await searchBls([q]);
    return rows.map(({ code, name }) => ({ code, name }));
  } catch {
    return [];
  }
}

const saveSchema = z
  .array(
    z.object({
      key: z.string().min(1).max(200),
      code: z.string().min(1).max(20).nullable(),
      skip: z.boolean(),
      grams: z.record(z.string().max(30), z.number().positive().max(MAX_GRAMS_PER_UNIT)),
    }),
  )
  .min(1)
  .max(100);

export async function saveNutrition(recipeId: number, input: unknown): Promise<{ message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { message: NOT_LOGGED_IN };
  const parsed = saveSchema.safeParse(input);
  if (!recipeIdSchema.safeParse(recipeId).success || !parsed.success) {
    return { message: `Bitte prüfe die Grammangaben (mehr als 0, höchstens ${MAX_GRAMS_PER_UNIT} g).` };
  }

  try {
    const [ingredients, mappings] = await Promise.all([ingredientsWithSubstitutes(recipeId), listMappings()]);
    if (!ingredients) return { message: "Dieses Rezept gibt es nicht mehr." };
    const keys = new Set(ingredients.filter((i) => !i.heading).map((i) => ingredientKey(i.name)));
    // Nur Zutaten dieses Rezepts, nur mit Eintrag oder "nicht mitrechnen"
    const entries = parsed.data.filter((e) => keys.has(e.key) && (e.skip || e.code));
    const codes = await existingCodes(entries.flatMap((e) => (e.code && !e.skip ? [e.code] : [])));
    if (entries.some((e) => !e.skip && !codes.has(e.code!))) return { message: "Ein Eintrag wurde nicht gefunden. Bitte lade die Seite neu." };

    await saveMappings(
      entries.map((e) => ({
        key: e.key,
        blsCode: e.code,
        skip: e.skip,
        // Gramm aus anderen Rezepten (andere Einheiten) behalten
        grams: { ...(mappings.get(e.key)?.grams ?? {}), ...e.grams },
      })),
      user.id,
    );
  } catch {
    return { message: "Speichern hat nicht geklappt. Bitte versuch es noch einmal." };
  }
  revalidatePath("/");
  revalidatePath(`/rezepte/${recipeId}`);
  return {};
}
