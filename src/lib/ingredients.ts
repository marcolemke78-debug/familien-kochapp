// Eine getippte Zutatenzeile ("200 g Mehl") in Menge, Einheit und Name zerlegen – und zurück.
import { normalizeUnit } from "./units";
import { formatQuantity } from "./scale";

export type Ingredient = {
  quantity: number | null; // null = keine Zahl ("Salz nach Geschmack")
  quantityMax: number | null; // nur bei Spannen wie "2–3"
  unit: string | null;
  name: string;
  heading?: true; // Zwischenüberschrift wie "Für die Soße" (ohne Menge, wird nicht umgerechnet)
};

const UNICODE_FRACTIONS: Record<string, number> = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125 };

// Reihenfolge wichtig: "1 1/2", "1/2", "1 ½", "1½", "1.500" (Tausenderpunkt), zuletzt "1,5"
const NUM = String.raw`(?:\d+\s+\d+/\d+|\d+/\d+|\d+\s+[¼½¾⅓⅔⅛]|\d*[¼½¾⅓⅔⅛]|\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?)`;
const LINE = new RegExp(String.raw`^(${NUM})(?:\s*(?:-|–|bis)\s*(${NUM}))?\s*(.*)$`);

function parseNumber(text: string): number | null {
  const t = text.trim();
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[3]) ? Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]) : null;
  const fraction = t.match(/^(\d+)\/(\d+)$/);
  if (fraction) return Number(fraction[2]) ? Number(fraction[1]) / Number(fraction[2]) : null;
  const unicode = t.match(/^(\d*)\s*([¼½¾⅓⅔⅛])$/);
  if (unicode) return Number(unicode[1] || 0) + UNICODE_FRACTIONS[unicode[2]];
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replaceAll(".", "")); // "1.500" = 1500
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseIngredientLine(line: string): Ingredient {
  const text = line.trim().replace(/\s+/g, " ");
  const asName: Ingredient = { quantity: null, quantityMax: null, unit: null, name: text };

  // "Für die Soße:" -> Überschrift. Eine Zeile mit Menge ("2 EL Öl:") bleibt eine Zutat.
  const heading = text.match(/^(\D.*?)\s*:$/);
  if (heading && !LINE.test(text)) return { ...asName, name: heading[1], heading: true };

  const match = text.match(LINE);
  if (!match) return asName;

  const quantity = parseNumber(match[1]);
  const quantityMax = match[2] ? parseNumber(match[2]) : null;
  if (quantity === null || (match[2] && quantityMax === null)) return asName;

  let rest = match[3];
  let unit: string | null = null;
  const [firstWord] = rest.split(" ");
  const normalized = firstWord ? normalizeUnit(firstWord) : null;
  if (normalized) {
    unit = normalized;
    rest = rest.slice(firstWord.length).trim();
  }

  // Ohne Namen ("200 g") lieber alles als Namen behalten, damit nichts verloren geht
  if (!rest) return asName;
  return { quantity, quantityMax, unit, name: rest };
}

export function formatIngredient(ingredient: Ingredient): string {
  const { quantity, quantityMax, unit, name } = ingredient;
  if (ingredient.heading) return `${name}:`;
  const amount =
    quantity === null
      ? ""
      : quantityMax === null
        ? formatQuantity(quantity, unit)
        : `${formatQuantity(quantity, unit)}–${formatQuantity(quantityMax, unit)}`;
  return [amount, unit, name].filter(Boolean).join(" ");
}
