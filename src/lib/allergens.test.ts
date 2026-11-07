import { describe, it, expect } from "vitest";
import { checkIngredient, familySuitability, ingredientKey, markIngredients, recipeSuitability, type AllergenRule } from "./allergens";

// Nur erfundene Allergene – echte stehen ausschließlich in D1.
const rule = (r: Partial<AllergenRule> = {}): AllergenRule => ({ id: 1, userId: 1, name: "Zorbel", synonyms: [], mode: "always", ...r });

describe("checkIngredient", () => {
  it("findet das Allergen unabhängig von Groß-/Kleinschreibung und Leerzeichen", () => {
    expect(checkIngredient("  zORBEL ", null, [rule()])).toEqual([{ ruleId: 1, userId: 1, level: "red" }]);
  });

  it("erkennt Plural und Umlaut-Plural", () => {
    expect(checkIngredient("Zorbeln", null, [rule()])).toHaveLength(1);
    expect(checkIngredient("Zorbels", null, [rule()])).toHaveLength(1);
    expect(checkIngredient("Quämbe", null, [rule({ name: "Quamb" })])).toHaveLength(1);
  });

  it("erkennt zusammengesetzte Wörter mit dem Allergen am Ende oder (ab 4 Buchstaben) am Anfang", () => {
    expect(checkIngredient("Hasenzorbel", null, [rule()])).toHaveLength(1);
    expect(checkIngredient("Zorbelmus, fein", null, [rule()])).toHaveLength(1);
    // kurze Begriffe nicht am Wortanfang, sonst zu viele Fehlalarme
    expect(checkIngredient("Qubergsalat", null, [rule({ name: "Qu" })])).toEqual([]);
    expect(checkIngredient("Hühnerqu", null, [rule({ name: "Qu" })])).toHaveLength(1);
  });

  it("findet nichts, wenn der Begriff nur mitten im Wort steckt", () => {
    expect(checkIngredient("Mazorbeltee", null, [rule()])).toEqual([]);
    expect(checkIngredient("Mehl", null, [rule()])).toEqual([]);
  });

  it("prüft Synonyme und Begriffe aus mehreren Wörtern", () => {
    const r = rule({ synonyms: ["Plimm-Aufstrich", "grüne Quimbe"] });
    expect(checkIngredient("Plimm-Aufstrich", null, [r])).toHaveLength(1);
    expect(checkIngredient("2 grüne Quimben", null, [r])).toHaveLength(1);
    expect(checkIngredient("rote Quimben", null, [r])).toEqual([]);
  });

  it("Modus nur_roh: roh = rot, unbekannt = gelb, gegart = unbedenklich", () => {
    const r = rule({ mode: "raw_only" });
    expect(checkIngredient("Zorbel", true, [r])).toEqual([{ ruleId: 1, userId: 1, level: "red" }]);
    expect(checkIngredient("Zorbel", null, [r])).toEqual([{ ruleId: 1, userId: 1, level: "yellow" }]);
    expect(checkIngredient("Zorbel", false, [r])).toEqual([]);
  });

  it("meldet jede betroffene Regel einmal, auch bei mehreren Treffern", () => {
    const rules = [rule({ synonyms: ["Zorbelmus"] }), rule({ id: 2, userId: 2, name: "Quimbe" })];
    expect(checkIngredient("Zorbelmus mit Quimbe", null, rules)).toEqual([
      { ruleId: 1, userId: 1, level: "red" },
      { ruleId: 2, userId: 2, level: "red" },
    ]);
  });
});

describe("ingredientKey", () => {
  it("bleibt gleich bei Groß-/Kleinschreibung, Umlauten und Satzzeichen", () => {
    expect(ingredientKey("  Grüne Quimbe, fein ")).toBe("grune quimbe fein");
    expect(ingredientKey("grüne quimbe fein")).toBe("grune quimbe fein");
  });
});

describe("recipeSuitability", () => {
  const rules = [rule(), rule({ id: 2, name: "Quimbe", mode: "raw_only" })];
  const ing = (name: string, isRaw: boolean | null = null) => ({ name, isRaw });

  it("passt, wenn keine Zutat betroffen ist", () => {
    expect(recipeSuitability([ing("Mehl")], rules, new Set())).toBe("passt");
  });

  it("nicht geeignet bei roter Zutat ohne freigegebenen Ersatz", () => {
    expect(recipeSuitability([ing("Mehl"), ing("Zorbel")], rules, new Set())).toBe("nicht_geeignet");
  });

  it("prüfen bei gelber Zutat ohne Ersatz", () => {
    expect(recipeSuitability([ing("Quimbe")], rules, new Set())).toBe("pruefen");
  });

  it("rot schlägt gelb", () => {
    expect(recipeSuitability([ing("Quimbe"), ing("Zorbel")], rules, new Set())).toBe("nicht_geeignet");
  });

  it("mit Ersatz, wenn alle betroffenen Zutaten freigegebenen Ersatz haben", () => {
    expect(recipeSuitability([ing("Quimbe"), ing("Zorbel"), ing("Mehl")], rules, new Set(["quimbe", "zorbel"]))).toBe("mit_ersatz");
  });
});

describe("markIngredients", () => {
  const names = new Map([
    [1, "Testperson A"],
    [2, "Testperson B"],
  ]);
  const rules = [rule(), rule({ id: 2, userId: 2, name: "Quimbe", mode: "raw_only" })];

  it("liefert je Zutat die Betroffenen mit Name und Allergen, Überschriften und Unbedenkliches = null", () => {
    const marks = markIngredients(
      [{ name: "Für den Teig", heading: true }, { name: "Mehl" }, { name: "Zorbelmus" }, { name: "Quimben" }],
      rules,
      [],
      names,
    );
    expect(marks[0]).toBeNull();
    expect(marks[1]).toBeNull();
    expect(marks[2]).toEqual({ level: "red", people: [{ person: "Testperson A", allergen: "Zorbel", level: "red", replacement: null }] });
    expect(marks[3]).toEqual({ level: "yellow", people: [{ person: "Testperson B", allergen: "Quimbe", level: "yellow", replacement: null }] });
  });

  it("gegart bei nur_roh ist unbedenklich, roh ist rot", () => {
    const marks = markIngredients([{ name: "Quimbe", raw: false }, { name: "Quimbe", raw: true }], rules, [], names);
    expect(marks[0]).toBeNull();
    expect(marks[1]?.level).toBe("red");
  });

  it("freigegebener Ersatz der betroffenen Person entschärft die Zutat (level ok)", () => {
    const subs = [{ ingredientKey: "zorbel", userId: 1, replacement: "Testersatz" }];
    expect(markIngredients([{ name: "Zorbel" }], rules, subs, names)[0]).toEqual({
      level: "ok",
      people: [{ person: "Testperson A", allergen: "Zorbel", level: "red", replacement: "Testersatz" }],
    });
  });

  it("zeigt freigegebenen Ersatz auch bei Zutaten ohne Allergie-Treffer", () => {
    const subs = [{ ingredientKey: "mehl", userId: 2, replacement: "Testmehl" }];
    expect(markIngredients([{ name: "Mehl" }], rules, subs, names)[0]).toEqual({
      level: "ok",
      people: [{ person: "Testperson B", allergen: null, level: null, replacement: "Testmehl" }],
    });
    // auch ganz ohne Regeln
    expect(markIngredients([{ name: "Mehl" }], [], subs, names)[0]?.level).toBe("ok");
  });

  it("Ersatz einer anderen Person zählt nicht", () => {
    const subs = [{ ingredientKey: "zorbel", userId: 2, replacement: "Testersatz" }];
    expect(markIngredients([{ name: "Zorbel" }], rules, subs, names)[0]?.level).toBe("red");
  });
});

describe("familySuitability", () => {
  // Person 1 verträgt kein Zorbel, Person 2 kein rohes Quimbe
  const rules = [rule(), rule({ id: 2, userId: 2, name: "Quimbe", mode: "raw_only" })];
  const ing = (name: string, isRaw: boolean | null = null) => ({ name, isRaw });

  it("ohne Regeln passt alles", () => {
    expect(familySuitability([ing("Zorbel")], [], [])).toBe("passt");
  });

  it("nimmt den schlechtesten Wert über alle Personen", () => {
    expect(familySuitability([ing("Quimbe")], rules, [])).toBe("pruefen");
    expect(familySuitability([ing("Quimbe"), ing("Zorbel")], rules, [])).toBe("nicht_geeignet");
  });

  it("Ersatz zählt nur für die Person, die ihn freigegeben hat", () => {
    const forPerson1 = [{ ingredientKey: "zorbel", userId: 1, replacement: "Testersatz" }];
    expect(familySuitability([ing("Zorbel")], rules, forPerson1)).toBe("mit_ersatz");
    const forPerson2 = [{ ingredientKey: "zorbel", userId: 2, replacement: "Testersatz" }];
    expect(familySuitability([ing("Zorbel")], rules, forPerson2)).toBe("nicht_geeignet");
  });
});
