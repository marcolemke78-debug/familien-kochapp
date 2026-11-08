// Spec 08: Einkaufsliste über Bring. Reine Logik ohne Datenbank.
// Bring liest die Rezeptseite selbst (schema.org Recipe). Darum gibt es eine kurzlebige Export-Adresse
// ohne Login, die nur Titel, Portionen und Zutaten enthält (kein Foto, keine Allergien).
import { formatIngredient, type Ingredient } from "./ingredients";
import { scaleIngredient } from "./scale";

export const EXPORT_MINUTES = 10; // so lange ist die Export-Adresse erreichbar
const BRING_DEEPLINK = "https://api.getbring.com/rest/bringrecipes/deeplink";

const lines = (ingredients: Ingredient[]) => ingredients.filter((i) => !i.heading).map(formatIngredient);

/** JSON-LD für <script type="application/ld+json">. "<" wird escaped, damit nichts aus dem Block ausbricht. */
export function recipeJsonLd(title: string, servings: number, ingredients: Ingredient[]): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: title,
    recipeYield: String(servings),
    recipeIngredient: lines(ingredients),
  };
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}

/** Adresse der Bring-Schnittstelle. Sie leitet weiter in die Bring-App (oder ins Web). Bring rechnet die Portionen um. */
export function bringDeeplinkUrl(exportUrl: string, baseServings: number, servings: number): string {
  const params = new URLSearchParams({
    url: exportUrl,
    source: "web",
    baseQuantity: String(baseServings),
    requestedQuantity: String(servings),
  });
  return `${BRING_DEEPLINK}?${params}`;
}

/** Ausweg ohne Bring: Liste als Text zum Teilen oder Kopieren */
export function shareText(title: string, ingredients: Ingredient[], baseServings: number, servings: number): string {
  const factor = servings / baseServings;
  const scaled = ingredients.filter((i) => !i.heading).map((i) => `- ${formatIngredient(scaleIngredient(i, factor))}`);
  return [`${title} (${servings} ${servings === 1 ? "Portion" : "Portionen"})`, ...scaled].join("\n");
}

export function newExportToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function isExportToken(token: string): boolean {
  return /^[0-9a-f]{32}$/.test(token);
}
