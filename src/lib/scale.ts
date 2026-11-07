// Portionen umrechnen mit Küchen-Rundung (Entscheidung vom 07.11.2026, siehe specs/02-rezepte.md)
import { unitGroup } from "./units";
import type { Ingredient } from "./ingredients";

function roundTo(value: number, step: number): number {
  // + 1e-9 gleicht Rechenungenauigkeiten aus (1,875 / 0,05 = 37,4999…)
  const rounded = Math.round(value / step + 1e-9) * step;
  return Number(rounded.toFixed(2));
}

function stepFor(value: number, unit: string | null): number {
  switch (unitGroup(unit)) {
    case "metricSmall":
      return value < 10 ? 1 : value < 100 ? 5 : 10;
    case "metricLarge":
      return 0.05;
    case "quarter":
      return 0.25;
    case "half":
      return 0.5;
  }
}

export function scaleQuantity(quantity: number, unit: string | null, factor: number): number {
  if (factor === 1 || quantity === 0) return quantity; // Originalmenge nie verändern
  const raw = quantity * factor;
  const step = stepFor(raw, unit);
  return Math.max(roundTo(raw, step), step); // nie auf 0 runden
}

// Schlüssel = Nachkommateil auf 2 Stellen gerundet (⅓ = 0,333… -> "0.33")
const FRACTIONS: Record<string, string> = { "0.13": "⅛", "0.25": "¼", "0.33": "⅓", "0.5": "½", "0.67": "⅔", "0.75": "¾" };

export function formatQuantity(quantity: number, unit: string | null): string {
  const group = unitGroup(unit);
  if (group !== "metricSmall" && group !== "metricLarge") {
    const whole = Math.floor(quantity);
    const fraction = FRACTIONS[String(Number((quantity - whole).toFixed(2)))];
    if (fraction) return whole === 0 ? fraction : `${whole}${fraction}`;
  }
  return quantity.toLocaleString("de-DE", { maximumFractionDigits: 2, useGrouping: false });
}

export function scaleIngredient(ingredient: Ingredient, factor: number): Ingredient {
  if (ingredient.quantity === null) return ingredient;
  return {
    ...ingredient,
    quantity: scaleQuantity(ingredient.quantity, ingredient.unit, factor),
    quantityMax:
      ingredient.quantityMax === null ? null : scaleQuantity(ingredient.quantityMax, ingredient.unit, factor),
  };
}
