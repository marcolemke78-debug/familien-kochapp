"use server";
// Spec 06: "Diese Zutaten besser nicht" – Vorschläge holen, freigeben, entfernen.
// Jede Action prüft den Login. Freigeben und Entfernen wirken nur für die angemeldete Person selbst.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getRecipe } from "@/lib/recipes";
import { formatIngredient } from "@/lib/ingredients";
import { ingredientKey } from "@/lib/allergens";
import { approveSubstitution, listRules, removeSubstitution } from "@/lib/allergen-store";
import { approveInputSchema, safeSuggestions, type Suggestion } from "@/lib/substitute";
import { suggestWithClaude } from "@/lib/substitute-claude";

const NOT_LOGGED_IN = "Du bist nicht mehr angemeldet. Bitte lade die Seite neu.";
const recipeIdSchema = z.number().int().positive();
const MAX_SELECTED = 10;

// name = Zutat ohne Menge (dafür wird freigegeben), Vorschläge passend zur Zeile mit Menge
export type SuggestResult = { ok: true; suggestions: (Suggestion & { name: string })[] } | { ok: false; error: string };

export async function suggestSubstitutes(recipeId: number, positions: number[]): Promise<SuggestResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: NOT_LOGGED_IN };
  const parsed = z.array(z.number().int().min(0)).min(1).max(MAX_SELECTED).safeParse(positions);
  if (!recipeIdSchema.safeParse(recipeId).success || !parsed.success) {
    return { ok: false, error: `Bitte wähle 1 bis ${MAX_SELECTED} Zutaten.` };
  }

  try {
    const recipe = await getRecipe(recipeId);
    if (!recipe) return { ok: false, error: "Dieses Rezept gibt es nicht mehr." };
    const chosen = [...new Set(parsed.data)].map((i) => recipe.ingredients[i]).filter((i) => i && !i.heading);
    if (chosen.length === 0) return { ok: false, error: "Das Rezept wurde gerade geändert. Bitte lade die Seite neu." };

    const lines = chosen.map(formatIngredient);
    const result = await suggestWithClaude(
      { title: recipe.title, ingredients: recipe.ingredients.map(formatIngredient), steps: recipe.steps },
      lines,
    );
    if (!result.ok) return result;
    // Gegen das eigene Profil prüfen, bevor etwas angezeigt wird
    const safe = safeSuggestions(result.output, lines, await listRules(user.id));
    return { ok: true, suggestions: safe.map((s, i) => ({ ...s, name: chosen[i].name })) };
  } catch {
    return { ok: false, error: "Die Vorschläge haben nicht geklappt. Bitte versuch es noch einmal." };
  }
}

export async function approveSubstitute(recipeId: number, input: unknown): Promise<{ message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { message: NOT_LOGGED_IN };
  const parsed = approveInputSchema.safeParse(input);
  if (!recipeIdSchema.safeParse(recipeId).success || !parsed.success) return { message: "Ungültige Angabe." };
  const { ingredient, replacement, note } = parsed.data;

  try {
    const recipe = await getRecipe(recipeId);
    const key = ingredientKey(ingredient);
    if (!recipe || !recipe.ingredients.some((i) => !i.heading && ingredientKey(i.name) === key)) {
      return { message: "Diese Zutat gibt es im Rezept nicht mehr. Bitte lade die Seite neu." };
    }
    // Nochmals prüfen: Der Text kommt aus dem Browser
    const conflict = safeSuggestions({ suggestions: [{ ingredient, options: [{ replacement, note: "" }] }] }, [ingredient], await listRules(user.id));
    if (conflict[0].options.length === 0) return { message: "Dieser Ersatz passt nicht zu deinem Allergie-Profil." };

    await approveSubstitution(recipeId, key, user.id, replacement, note);
  } catch {
    return { message: "Speichern hat nicht geklappt. Bitte versuch es noch einmal." };
  }
  revalidatePath("/");
  revalidatePath(`/rezepte/${recipeId}`);
  return {};
}

export async function removeSubstitute(recipeId: number, ingredient: string): Promise<{ message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { message: NOT_LOGGED_IN };
  if (!recipeIdSchema.safeParse(recipeId).success || typeof ingredient !== "string") return { message: "Ungültige Angabe." };
  try {
    await removeSubstitution(recipeId, ingredientKey(ingredient), user.id);
  } catch {
    return { message: "Entfernen hat nicht geklappt. Bitte versuch es noch einmal." };
  }
  revalidatePath("/");
  revalidatePath(`/rezepte/${recipeId}`);
  return {};
}
