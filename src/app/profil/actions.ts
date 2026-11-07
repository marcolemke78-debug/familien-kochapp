"use server";
// Server Actions fürs Allergie-Profil. Jede Action prüft selbst den Login.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { parseAllergenForm, type AllergenFieldErrors } from "@/lib/allergen-input";
import { addRule, deleteRule } from "@/lib/allergen-store";

// values: Eingaben zurück ins Formular, weil React es nach dem Absenden leert
export type AllergenFormState = {
  message?: string;
  fieldErrors?: AllergenFieldErrors;
  values?: { name: string; synonyms: string; mode: string };
};

const NOT_LOGGED_IN = "Du bist nicht mehr angemeldet. Bitte lade die Seite neu.";

export async function addAllergenRule(_prev: AllergenFormState, fd: FormData): Promise<AllergenFormState> {
  const user = await getCurrentUser();
  if (!user) return { message: NOT_LOGGED_IN };

  const values = { name: String(fd.get("name") ?? ""), synonyms: String(fd.get("synonyms") ?? ""), mode: String(fd.get("mode") ?? "") };
  const parsed = parseAllergenForm(fd);
  if (!parsed.success) return { message: "Bitte prüfe die markierten Felder.", fieldErrors: parsed.fieldErrors, values };

  try {
    await addRule(user.id, parsed.data); // gehört immer der angemeldeten Person
  } catch {
    return { message: "Speichern hat nicht geklappt. Bitte versuch es noch einmal.", values };
  }
  revalidatePath("/", "layout"); // Markierungen auf allen Rezeptseiten ändern sich mit
  return {};
}

export async function deleteAllergenRule(ruleId: number): Promise<{ message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { message: NOT_LOGGED_IN };
  if (!z.number().int().positive().safeParse(ruleId).success) return { message: "Unbekannter Eintrag." };

  try {
    if (!(await deleteRule(ruleId, user.id))) return { message: "Diesen Eintrag kannst nur du selbst löschen." };
  } catch {
    return { message: "Löschen hat nicht geklappt. Bitte versuch es noch einmal." };
  }
  revalidatePath("/", "layout");
  return {};
}
