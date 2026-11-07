import { describe, it, expect } from "vitest";
import { parseRecipeForm, parseRecipeId } from "./recipe-input";

describe("parseRecipeId", () => {
  it("akzeptiert nur positive ganze Zahlen aus der URL", () => {
    expect(parseRecipeId("12")).toBe(12);
    for (const bad of ["0", "-1", "abc", "1e3", "12.5", "012", "", "99999999999"]) {
      expect(parseRecipeId(bad), bad).toBeNull();
    }
  });
});

const CLIENT_ID = "1b4e28ba-2fa1-4d3b-a3f5-ef19b5a7633b";

// Baut ein Formular wie der Browser es schickt. Erfundenes Testrezept.
function form(fields: Record<string, string | string[]>) {
  const fd = new FormData();
  const base: Record<string, string | string[]> = {
    clientId: CLIENT_ID,
    title: "Testrezept Gemüsepfanne",
    servings: "4",
    ingredient: ["200 g Testgemüse", "1 EL Öl"],
    step: ["Gemüse schneiden.", "In der Pfanne braten."],
    ...fields,
  };
  for (const [k, v] of Object.entries(base)) {
    for (const item of Array.isArray(v) ? v : [v]) fd.append(k, item);
  }
  return fd;
}

describe("parseRecipeForm", () => {
  it("liefert ein sauberes Rezept mit zerlegten Zutaten", () => {
    const result = parseRecipeForm(
      form({
        description: "  Schnell und bunt  ",
        prepMinutes: "25",
        sourceUrl: "https://example.org/rezept",
        sourceNote: "  Testbuch Familienküche, S. 12  ",
        tag: ["hauptmahlzeit", "schnell"],
        device: ["airfryer"],
        hint_airfryer: "15 Min. bei 180 °C",
        hint_tm6: "wird ignoriert, weil TM6 nicht angehakt ist",
      }),
    );
    expect(result).toEqual({
      success: true,
      data: {
        clientId: CLIENT_ID,
        title: "Testrezept Gemüsepfanne",
        description: "Schnell und bunt",
        servings: 4,
        prepMinutes: 25,
        sourceUrl: "https://example.org/rezept",
        sourceNote: "Testbuch Familienküche, S. 12",
        tags: ["hauptmahlzeit", "schnell"],
        devices: [{ device: "airfryer", hint: "15 Min. bei 180 °C" }],
        ingredients: [
          { quantity: 200, quantityMax: null, unit: "g", name: "Testgemüse" },
          { quantity: 1, quantityMax: null, unit: "EL", name: "Öl" },
        ],
        steps: ["Gemüse schneiden.", "In der Pfanne braten."],
      },
    });
  });

  it("macht leere freiwillige Felder zu null und nimmt 4 Portionen als Standard", () => {
    const result = parseRecipeForm(form({ servings: "", description: "", prepMinutes: "", sourceUrl: "", sourceNote: "" }));
    expect(result.success && result.data).toMatchObject({ servings: 4, description: null, prepMinutes: null, sourceUrl: null, sourceNote: null, tags: [], devices: [] });
  });

  it("ignoriert leere Zutaten- und Schrittzeilen", () => {
    const result = parseRecipeForm(form({ ingredient: ["", "1 Testapfel", "   "], step: ["", "Essen."] }));
    expect(result.success && result.data.ingredients).toHaveLength(1);
    expect(result.success && result.data.steps).toEqual(["Essen."]);
  });

  it("verlangt Titel, mindestens eine Zutat und einen Schritt", () => {
    const result = parseRecipeForm(form({ title: "  ", ingredient: [""], step: [""] }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.fieldErrors).sort()).toEqual(["ingredients", "steps", "title"]);
    }
  });

  it("lehnt unsinnige Werte ab", () => {
    const cases: Record<string, string | string[]>[] = [
      { servings: "0" },
      { servings: "abc" },
      { prepMinutes: "-5" },
      { sourceUrl: "javascript:alert(1)" },
      { tag: ["gibtsnicht"] },
      { device: ["mikrowelle"] },
      { clientId: "keine-uuid" },
      { title: "x".repeat(121) },
      { sourceNote: "x".repeat(201) },
    ];
    for (const bad of cases) {
      expect(parseRecipeForm(form(bad)).success, JSON.stringify(bad)).toBe(false);
    }
  });

  it("entfernt doppelte Kategorien und Geräte", () => {
    const result = parseRecipeForm(form({ tag: ["schnell", "schnell"], device: ["tm6", "tm6"] }));
    expect(result.success && result.data.tags).toEqual(["schnell"]);
    expect(result.success && result.data.devices).toEqual([{ device: "tm6", hint: null }]);
  });

  it("übernimmt Zwischenüberschriften, verlangt aber mindestens eine echte Zutat", () => {
    const result = parseRecipeForm(form({ ingredient: ["Für den Teig:", "200 g Testmehl"] }));
    expect(result.success && result.data.ingredients[0]).toEqual({ quantity: null, quantityMax: null, unit: null, name: "Für den Teig", heading: true });

    const onlyHeadings = parseRecipeForm(form({ ingredient: ["Für den Teig:", "Für die Soße:"] }));
    expect(onlyHeadings.success).toBe(false);
    if (!onlyHeadings.success) expect(onlyHeadings.fieldErrors.ingredients).toBeDefined();
  });
});
