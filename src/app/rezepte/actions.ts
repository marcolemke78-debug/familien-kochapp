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
