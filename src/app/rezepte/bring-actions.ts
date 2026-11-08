"use server";
// Spec 08: Export-Adresse für Bring anlegen und die Bring-Adresse zurückgeben.
import { headers } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getRecipe } from "@/lib/recipes";
import { bringDeeplinkUrl } from "@/lib/bring";
import { createExport } from "@/lib/bring-store";

const inputSchema = z.object({ recipeId: z.number().int().positive(), servings: z.number().int().min(1).max(50) });

export type BringResult = { ok: true; url: string } | { ok: false; error: string };

export async function createBringLink(recipeId: number, servings: number): Promise<BringResult> {
  if (!(await getCurrentUser())) return { ok: false, error: "Du bist nicht mehr angemeldet. Bitte lade die Seite neu." };
  const parsed = inputSchema.safeParse({ recipeId, servings });
  if (!parsed.success) return { ok: false, error: "Ungültige Angabe." };

  try {
    const recipe = await getRecipe(parsed.data.recipeId);
    if (!recipe) return { ok: false, error: "Dieses Rezept gibt es nicht mehr." };
    const token = await createExport(recipe.id);
    const host = (await headers()).get("host") ?? "";
    const protocol = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http" : "https";
    return { ok: true, url: bringDeeplinkUrl(`${protocol}://${host}/bring/${token}`, recipe.servings, parsed.data.servings) };
  } catch {
    return { ok: false, error: "Das hat nicht geklappt. Bitte versuch es noch einmal." };
  }
}
