import { describe, it, expect } from "vitest";
import { safeSuggestions, substituteUserText, approveInputSchema } from "./substitute";
import type { AllergenRule } from "./allergens";

// Erfundene Allergene, echte stehen nur in D1.
const rules: AllergenRule[] = [
  { id: 1, userId: 1, name: "Zorbel", synonyms: ["Plimm"], mode: "always" },
  { id: 2, userId: 1, name: "Quimbe", synonyms: [], mode: "raw_only" },
];

describe("safeSuggestions", () => {
  it("behält nur angefragte Zutaten und filtert Ersatz, der selbst gegen das Profil verstößt", () => {
    const result = safeSuggestions(
      {
        suggestions: [
          {
            ingredient: "100 g Zorbel",
            options: [
              { replacement: "Plimm-Creme", note: "enthält Synonym" },
              { replacement: "Testersatz A", note: "milder" },
              { replacement: "Zorbelmus light", note: "enthält Allergen" },
            ],
          },
          { ingredient: "Nicht angefragt", options: [{ replacement: "X", note: "" }] },
        ],
      },
      ["100 g Zorbel"],
      rules,
    );
    expect(result).toEqual([{ ingredient: "100 g Zorbel", options: [{ replacement: "Testersatz A", note: "milder" }] }]);
  });

  it("filtert auch Ersatz mit nur-roh-Allergen (Zubereitung des Ersatzes unbekannt)", () => {
    const result = safeSuggestions({ suggestions: [{ ingredient: "Mehl", options: [{ replacement: "Quimben", note: "" }] }] }, ["Mehl"], rules);
    expect(result).toEqual([{ ingredient: "Mehl", options: [] }]);
  });

  it("ordnet Zutaten unabhängig von Groß-/Kleinschreibung zu und begrenzt auf 3 Optionen", () => {
    const options = ["A", "B", "C", "D"].map((x) => ({ replacement: `Test${x}`, note: "" }));
    const result = safeSuggestions({ suggestions: [{ ingredient: "mehl", options }] }, ["Mehl"], []);
    expect(result).toEqual([{ ingredient: "Mehl", options: options.slice(0, 3) }]);
  });

  it("listet angefragte Zutaten ohne Antwort mit leerer Liste", () => {
    expect(safeSuggestions({ suggestions: [] }, ["Mehl"], [])).toEqual([{ ingredient: "Mehl", options: [] }]);
  });
});

describe("substituteUserText", () => {
  it("enthält Rezept und gewählte Zutaten, aber keine Allergie-Angaben", () => {
    const text = substituteUserText({ title: "Testrezept", ingredients: ["100 g Zorbel", "1 EL Öl"], steps: ["Mischen."] }, ["100 g Zorbel"]);
    expect(text).toContain("Testrezept");
    expect(text).toContain("Ersetzen: 100 g Zorbel");
    expect(text).not.toMatch(/allergi/i);
  });
});

describe("approveInputSchema", () => {
  it("verlangt Zutat und Ersatz mit sinnvoller Länge", () => {
    expect(approveInputSchema.safeParse({ ingredient: "Zorbel", replacement: " Testersatz ", note: "" }).data).toEqual({
      ingredient: "Zorbel",
      replacement: "Testersatz",
      note: null,
    });
    expect(approveInputSchema.safeParse({ ingredient: "Zorbel", replacement: "  ", note: null }).success).toBe(false);
    expect(approveInputSchema.safeParse({ ingredient: "Zorbel", replacement: "x".repeat(121), note: null }).success).toBe(false);
  });
});
