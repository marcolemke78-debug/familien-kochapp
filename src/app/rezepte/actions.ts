"use server";
// Server Actions für Rezepte. Jede Action prüft selbst den Login (nicht nur die Seite).
import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { parseRecipeForm, type FieldErrors, type RecipeInput } from "@/lib/recipe-input";
import { deletePhoto, storePhoto } from "@/lib/photos";
import * as recipes from "@/lib/recipes";
import { DEVICES, type Device } from "@/lib/recipe-meta";
import { formatIngredient } from "@/lib/ingredients";
import { checkStep, variantInputSchema, type Variant } from "@/lib/convert";
import { convertWithClaude } from "@/lib/convert-claude";
import { checkComboStep, comboInputSchema, usesBothDevices, type Combo } from "@/lib/combo";
import { planComboWithClaude } from "@/lib/combo-claude";

export type SaveState = {
  message?: string;
  fieldErrors?: FieldErrors & { photo?: string };
};

const recipeIdSchema = z.number().int().positive();
const NOT_LOGGED_IN = "Du bist nicht mehr angemeldet. Bitte lade die Seite neu.";

// recipeId: null = neues Rezept, Zahl = bestehendes bearbeiten (per .bind im Formular gesetzt)
export async function saveRecipe(recipeId: number | null, _prev: SaveState, fd: FormData): Promise<SaveState> {
  const user = await getCurrentUser();
  if (!user) return { message: NOT_LOGGED_IN };
  if (recipeId !== null && !recipeIdSchema.safeParse(recipeId).success) return { message: "Unbekanntes Rezept." };

  const parsed = parseRecipeForm(fd);
  if (!parsed.success) return { message: "Bitte prüfe die markierten Felder.", fieldErrors: parsed.fieldErrors };
  const input = parsed.data;

  // redirect() wirft absichtlich einen Sonder-Fehler. Darum steht es NACH dem try/catch.
  let result: { targetId: number } | SaveState;
  try {
    result = await persist(recipeId, input, fd, user.id);
  } catch {
    return { message: "Speichern hat nicht geklappt. Bitte versuch es noch einmal." };
  }
  if (!("targetId" in result)) return result;

  revalidatePath("/");
  revalidatePath(`/rezepte/${result.targetId}`);
  // replace: Die Zurück-Taste führt danach nicht wieder ins Formular
  redirect(`/rezepte/${result.targetId}`, RedirectType.replace);
}

async function persist(
  recipeId: number | null,
  input: RecipeInput,
  fd: FormData,
  userId: number,
): Promise<{ targetId: number } | SaveState> {
  // Doppelklick / doppelt gesendet: dieses Formular hat schon ein Rezept angelegt -> dorthin
  if (recipeId === null) {
    const existing = await recipes.findRecipeIdByClientId(input.clientId);
    if (existing !== null) return { targetId: existing };
  }

  const previous = recipeId === null ? null : await recipes.getPhotoKey(recipeId);
  if (previous && !previous.exists) return { message: "Dieses Rezept gibt es nicht mehr." };

  // Foto zuerst nach R2, damit das Rezept nie auf ein fehlendes Foto zeigt
  const photo = fd.get("photo");
  let newPhotoKey: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    const stored = await storePhoto(photo);
    if (!stored.ok) return { message: "Das Foto hat nicht geklappt.", fieldErrors: { photo: stored.error } };
    newPhotoKey = stored.key;
  }

  try {
    if (recipeId === null) {
      return { targetId: await recipes.createRecipe(input, userId, newPhotoKey) };
    }
    const photoChange = newPhotoKey ?? (fd.get("removePhoto") === "1" ? null : undefined);
    await recipes.updateRecipe(recipeId, input, photoChange);
    if (photoChange !== undefined) await deletePhoto(previous?.photoKey); // altes Foto aufräumen
    return { targetId: recipeId };
  } catch (error) {
    // Ist das Rezept trotz Fehler gespeichert (z. B. Antwort von D1 verloren)? Dann Foto behalten.
    const savedId = recipeId ?? (await recipes.findRecipeIdByClientId(input.clientId));
    const saved = savedId === null ? null : await recipes.getPhotoKey(savedId);
    if (newPhotoKey && saved?.photoKey !== newPhotoKey) await deletePhoto(newPhotoKey);
    // Zwei gleichzeitige Klicks: der zweite scheitert an client_id UNIQUE -> zum ersten Rezept
    if (recipeId === null && savedId !== null) return { targetId: savedId };
    throw error;
  }
}

export async function deleteRecipe(recipeId: number): Promise<{ message: string }> {
  const user = await getCurrentUser();
  if (!user) return { message: NOT_LOGGED_IN };
  if (!recipeIdSchema.safeParse(recipeId).success) return { message: "Unbekanntes Rezept." };

  try {
    const { photoKey } = await recipes.deleteRecipe(recipeId);
    await deletePhoto(photoKey);
  } catch {
    return { message: "Löschen hat nicht geklappt. Bitte versuch es noch einmal." };
  }
  revalidatePath("/");
  redirect("/");
}

export async function markDeviceTested(recipeId: number, device: Device): Promise<{ message: string } | void> {
  const user = await getCurrentUser();
  if (!user) return { message: NOT_LOGGED_IN };
  const valid =
    recipeIdSchema.safeParse(recipeId).success && DEVICES.some((d) => d.value === device);
  if (!valid) return { message: "Unbekanntes Rezept oder Gerät." };

  try {
    await recipes.markDeviceTested(recipeId, device);
  } catch {
    return { message: "Das hat nicht geklappt. Bitte versuch es noch einmal." };
  }
  revalidatePath(`/rezepte/${recipeId}`);
  revalidatePath("/");
}

// --- Geräte-Umrechnung (Spec 05) --------------------------------------------

const isDevice = (value: unknown): value is Device => DEVICES.some((d) => d.value === value);

// Darf für dieses Gerät eine KI-Variante entstehen? Eine Geräteangabe aus dem Original (ohne Variante) bleibt unangetastet.
async function variantBlocked(recipeId: number, device: Device): Promise<string | null> {
  const row = await recipes.getDeviceRow(recipeId, device);
  if (row && row.converted_at === null) return "Für dieses Gerät gibt es schon eine Anleitung aus dem Original.";
  return null;
}

export type ConvertResult = { ok: true; variant: Variant } | { ok: false; error: string };

// Liefert nur eine Vorschau, speichert nichts
export async function convertRecipe(recipeId: number, device: Device): Promise<ConvertResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: NOT_LOGGED_IN };
  if (!recipeIdSchema.safeParse(recipeId).success || !isDevice(device)) return { ok: false, error: "Unbekanntes Rezept oder Gerät." };

  try {
    const recipe = await recipes.getRecipe(recipeId);
    if (!recipe) return { ok: false, error: "Dieses Rezept gibt es nicht mehr." };
    const blocked = await variantBlocked(recipeId, device);
    if (blocked) return { ok: false, error: blocked };
    return await convertWithClaude(device, {
      title: recipe.title,
      servings: recipe.servings,
      ingredients: recipe.ingredients.map(formatIngredient),
      steps: recipe.steps,
    });
  } catch {
    return { ok: false, error: "Die Umrechnung hat nicht geklappt. Bitte versuch es noch einmal." };
  }
}

// replaceTested: ausdrücklich bestätigt, dass eine getestete Variante ersetzt werden darf
export async function saveVariant(recipeId: number, device: Device, input: unknown, replaceTested: boolean): Promise<{ message: string } | void> {
  const user = await getCurrentUser();
  if (!user) return { message: NOT_LOGGED_IN };
  if (!recipeIdSchema.safeParse(recipeId).success || !isDevice(device)) return { message: "Unbekanntes Rezept oder Gerät." };

  const parsed = variantInputSchema(device).safeParse(input);
  if (!parsed.success) return { message: "Bitte prüfe die Schritte: Jeder Schritt braucht einen Text." };
  const variant: Variant = parsed.data;
  if (variant.steps.some((step) => checkStep(device, step.settings).errors.length > 0)) {
    return { message: "Einige Einstellungen kann das Gerät nicht. Bitte die rot markierten Werte ändern." };
  }

  try {
    const row = await recipes.getDeviceRow(recipeId, device);
    if (row && row.converted_at === null) return { message: "Für dieses Gerät gibt es schon eine Anleitung aus dem Original." };
    if (row?.status === "getestet" && !replaceTested) return { message: "Die getestete Version wird nur nach Bestätigung ersetzt." };
    if (!(await recipes.getPhotoKey(recipeId)).exists) return { message: "Dieses Rezept gibt es nicht mehr." };
    await recipes.saveVariant(recipeId, device, variant);
  } catch {
    return { message: "Speichern hat nicht geklappt. Bitte versuch es noch einmal." };
  }
  revalidatePath(`/rezepte/${recipeId}`);
  revalidatePath("/");
  redirect(`/rezepte/${recipeId}?geraet=${device}`, RedirectType.replace);
}

// --- TM6 und Heißluft zusammen (Spec 10) -------------------------------------

export type ComboResult = { ok: true; combo: Combo } | { ok: false; error: string };

// Liefert nur eine Vorschau, speichert nichts
export async function planCombo(recipeId: number): Promise<ComboResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: NOT_LOGGED_IN };
  if (!recipeIdSchema.safeParse(recipeId).success) return { ok: false, error: "Unbekanntes Rezept." };

  try {
    const recipe = await recipes.getRecipe(recipeId);
    if (!recipe) return { ok: false, error: "Dieses Rezept gibt es nicht mehr." };
    return await planComboWithClaude({
      title: recipe.title,
      servings: recipe.servings,
      ingredients: recipe.ingredients.map(formatIngredient),
      steps: recipe.steps,
    });
  } catch {
    return { ok: false, error: "Die Planung hat nicht geklappt. Bitte versuch es noch einmal." };
  }
}

// replaceTested: ausdrücklich bestätigt, dass eine getestete Kombi ersetzt werden darf
export async function saveCombo(recipeId: number, input: unknown, replaceTested: boolean): Promise<{ message: string } | void> {
  const user = await getCurrentUser();
  if (!user) return { message: NOT_LOGGED_IN };
  if (!recipeIdSchema.safeParse(recipeId).success) return { message: "Unbekanntes Rezept." };

  const parsed = comboInputSchema.safeParse(input);
  if (!parsed.success) return { message: "Bitte prüfe die Angaben: Nutzen und jeder Schritt brauchen einen Text." };
  // Erster Schritt kann nicht "gleichzeitig" sein
  const combo: Combo = { ...parsed.data, steps: parsed.data.steps.map((s, i) => (i === 0 ? { ...s, parallel: false } : s)) };
  if (combo.steps.some((step) => checkComboStep(step).errors.length > 0)) {
    return { message: "Einige Einstellungen passen nicht. Bitte die rot markierten Werte ändern." };
  }
  if (!usesBothDevices(combo.steps)) return { message: "Mindestens ein Schritt braucht den TM6 und einer die Heißluft." };

  try {
    const status = await recipes.getComboStatus(recipeId);
    if (status === "getestet" && !replaceTested) return { message: "Die getestete Version wird nur nach Bestätigung ersetzt." };
    if (!(await recipes.getPhotoKey(recipeId)).exists) return { message: "Dieses Rezept gibt es nicht mehr." };
    await recipes.saveCombo(recipeId, combo);
  } catch {
    return { message: "Speichern hat nicht geklappt. Bitte versuch es noch einmal." };
  }
  revalidatePath(`/rezepte/${recipeId}`);
  redirect(`/rezepte/${recipeId}?geraet=beide`, RedirectType.replace);
}

export async function markComboTested(recipeId: number): Promise<{ message: string } | void> {
  const user = await getCurrentUser();
  if (!user) return { message: NOT_LOGGED_IN };
  if (!recipeIdSchema.safeParse(recipeId).success) return { message: "Unbekanntes Rezept." };
  try {
    await recipes.markComboTested(recipeId);
  } catch {
    return { message: "Das hat nicht geklappt. Bitte versuch es noch einmal." };
  }
  revalidatePath(`/rezepte/${recipeId}`);
}
