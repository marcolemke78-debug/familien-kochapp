import { describe, expect, it } from "vitest";
import { computeNutrition, ingredientGrams, isLowCarb, rankCandidates, searchFragments, unitKey, type NutritionMapping } from "./nutrition";
import type { Ingredient } from "./ingredients";

// Nur erfundene Lebensmittel (siehe CLAUDE.md, Datenschutz)
const ing = (quantity: number | null, unit: string | null, name: string, quantityMax: number | null = null): Ingredient => ({ quantity, quantityMax, unit, name });
const food = { kcal: 200, protein: 10, fat: 5, carbs: 30, sugar: 4 }; // je 100 g
const mapping = (m: Partial<NutritionMapping> = {}): NutritionMapping => ({ blsCode: "X1", skip: false, grams: {}, food, ...m });

describe("unitKey", () => {
  it("Stück ohne Einheit, Stk. und Stück → leerer Schlüssel, Volumen → ml, sonst klein", () => {
    expect(unitKey(null)).toBe("");
    expect(unitKey("Stk.")).toBe("");
    expect(unitKey("Stück")).toBe("");
    expect(unitKey("dl")).toBe("ml");
    expect(unitKey("EL")).toBe("el");
    expect(unitKey("Zehen")).toBe("zehen");
  });
});

describe("ingredientGrams", () => {
  it("rechnet g, kg und mg fest um", () => {
    expect(ingredientGrams(ing(200, "g", "Zorbel"), {})).toBe(200);
    expect(ingredientGrams(ing(1.5, "kg", "Zorbel"), {})).toBe(1500);
    expect(ingredientGrams(ing(500, "mg", "Zorbel"), {})).toBe(0.5);
  });

  it("Volumen über Gramm je ml, auch für l und dl", () => {
    expect(ingredientGrams(ing(0.5, "l", "Quimbe"), { ml: 0.9 })).toBeCloseTo(450);
    expect(ingredientGrams(ing(2, "dl", "Quimbe"), { ml: 1 })).toBe(200);
  });

  it("Stück und Löffel über Gramm je Einheit, Spanne = Mittelwert", () => {
    expect(ingredientGrams(ing(3, null, "Plimm"), { "": 50 })).toBe(150);
    expect(ingredientGrams(ing(2, "EL", "Plimm"), { el: 10 })).toBe(20);
    expect(ingredientGrams(ing(2, null, "Plimm", 4), { "": 50 })).toBe(150);
  });

  it("null, wenn Menge oder Umrechnung fehlt", () => {
    expect(ingredientGrams(ing(null, null, "Plimm nach Geschmack"), { "": 1 })).toBeNull();
    expect(ingredientGrams(ing(2, "EL", "Plimm"), {})).toBeNull();
    expect(ingredientGrams(ing(1, "l", "Quimbe"), {})).toBeNull();
  });
});

describe("computeNutrition", () => {
  const ingredients = [ing(null, null, "Für den Teig"), ing(200, "g", "Zorbel"), ing(2, null, "Plimm"), ing(null, null, "Quimbe nach Geschmack")];
  ingredients[0].heading = true;

  it("summiert pro Portion und meldet fehlende Zutaten", () => {
    const mappings = new Map([
      ["zorbel", mapping()],
      ["plimm", mapping({ grams: { "": 100 } })],
    ]);
    const result = computeNutrition(ingredients, mappings, 4);
    // 200 g + 200 g = 400 g → 800 kcal / 4 Portionen
    expect(result.perServing).toEqual({ kcal: 200, protein: 10, fat: 5, carbs: 30, sugar: 4 });
    expect(result.missing).toEqual(["Quimbe nach Geschmack"]);
    expect(result.complete).toBe(false);
    expect(result.mapped).toBe(2);
  });

  it("„nicht mitrechnen“ zählt als erledigt, auch ohne Menge", () => {
    const mappings = new Map([
      ["zorbel", mapping()],
      ["plimm", mapping({ grams: { "": 100 } })],
      ["quimbe nach geschmack", mapping({ blsCode: null, skip: true, food: null })],
    ]);
    const result = computeNutrition(ingredients, mappings, 4);
    expect(result.complete).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("zugeordnet, aber Einheit nicht umrechenbar → fehlt", () => {
    const result = computeNutrition([ing(2, "EL", "Zorbel")], new Map([["zorbel", mapping()]]), 2);
    expect(result.missing).toEqual(["Zorbel"]);
    expect(result.complete).toBe(false);
  });

  it("Rezept ohne Zutaten ist nicht vollständig", () => {
    expect(computeNutrition([], new Map(), 2).complete).toBe(false);
  });
});

describe("isLowCarb", () => {
  it("nur vollständige Rezepte mit höchstens 20 g Kohlenhydraten pro Portion", () => {
    const values = { kcal: 0, protein: 0, fat: 0, carbs: 20, sugar: 0 };
    expect(isLowCarb({ perServing: values, missing: [], complete: true, mapped: 1 })).toBe(true);
    expect(isLowCarb({ perServing: { ...values, carbs: 20.1 }, missing: [], complete: true, mapped: 1 })).toBe(false);
    expect(isLowCarb({ perServing: { ...values, carbs: 5 }, missing: ["Zorbel"], complete: false, mapped: 1 })).toBe(false);
  });
});

describe("searchFragments", () => {
  it("Wörter ohne Umlaute, Einzahl-Formen und Wortteile langer Wörter, ohne Füllwörter", () => {
    const fragments = searchFragments("Zorbelplimme mit Quimben");
    expect(fragments).toContain("zorbelplimme");
    expect(fragments).toContain("plimme"); // Wortende = Grundwort
    expect(fragments).toContain("zorbel"); // Wortanfang
    expect(fragments).toContain("quimbe"); // Einzahl
    expect(fragments).not.toContain("mit");
  });
});

describe("rankCandidates", () => {
  it("bevorzugt Einträge, die mehr vom Namen abdecken, bei Gleichstand den kürzeren Namen", () => {
    const rows = [
      { code: "A", name: "Plimme Kuchen mit Zorbel und Quimbe", search: "plimme kuchen mit zorbel und quimbe" },
      { code: "B", name: "Zorbel, roh", search: "zorbel roh" },
      { code: "C", name: "Quimbe", search: "quimbe" },
      { code: "D", name: "Zorbelplimme, gekocht", search: "zorbelplimme gekocht" },
    ];
    const ranked = rankCandidates("Zorbelplimme", rows, 3).map((r) => r.code);
    expect(ranked[0]).toBe("D");
    expect(ranked).not.toContain("C");
  });

  it("findet getrennt geschriebene Namen und wertet Einzahl wie einen vollen Treffer", () => {
    const rows = [
      { code: "A", name: "Zorbelplimmekuchen", search: "zorbelplimmekuchen" },
      { code: "B", name: "Zorbel Plimme", search: "zorbel plimme" },
      { code: "C", name: "Quimbenauflauf mit Ei", search: "quimbenauflauf mit ei" },
      { code: "D", name: "Quimbe", search: "quimbe" },
    ];
    expect(rankCandidates("Zorbelplimme", rows)[0].code).toBe("B");
    expect(rankCandidates("Quimben", rows)[0].code).toBe("D");
  });
});
