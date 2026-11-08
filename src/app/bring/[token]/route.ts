// Spec 08: Rezeptseite für Bring, ohne Login (Cloudflare Access: Bypass nur für /bring/*).
// Enthält nur Titel, Portionen und Zutaten (mit freigegebenem Ersatz), kein Foto, keine Allergien.
// Ungültige oder abgelaufene Adressen: 404 ohne Hinweis, ob es das Rezept gibt.
import type { NextRequest } from "next/server";
import { isExportToken, recipeJsonLd } from "@/lib/bring";
import { findExport } from "@/lib/bring-store";
import { getRecipe } from "@/lib/recipes";
import { listApprovedSubstitutions } from "@/lib/allergen-store";
import { applySubstitutions } from "@/lib/nutrition";
import { formatIngredient } from "@/lib/ingredients";

const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function GET(_req: NextRequest, ctx: RouteContext<"/bring/[token]">) {
  const { token } = await ctx.params;
  const notFound = () =>
    new Response("Nicht gefunden", { status: 404, headers: { ...HEADERS, "Content-Type": "text/plain; charset=utf-8" } });
  if (!isExportToken(token)) return notFound();

  try {
    const recipeId = await findExport(token);
    const recipe = recipeId === null ? null : await getRecipe(recipeId);
    if (!recipe) return notFound();
    const { ingredients } = applySubstitutions(recipe.ingredients, await listApprovedSubstitutions(recipe.id));
    const items = ingredients.filter((i) => !i.heading);
    const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(recipe.title)}</title>
<script type="application/ld+json">${recipeJsonLd(recipe.title, recipe.servings, ingredients)}</script>
</head><body>
<h1>${escapeHtml(recipe.title)}</h1>
<p>${recipe.servings} Portionen</p>
<ul>${items.map((i) => `<li>${escapeHtml(formatIngredient(i))}</li>`).join("")}</ul>
</body></html>`;
    return new Response(html, { headers: { ...HEADERS, "Content-Type": "text/html; charset=utf-8" } });
  } catch {
    return new Response("Fehler", { status: 500, headers: { ...HEADERS, "Content-Type": "text/plain; charset=utf-8" } });
  }
}
