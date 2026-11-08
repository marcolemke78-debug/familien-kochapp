import { describe, it, expect } from "vitest";
import { parseIngredientLine, formatIngredient } from "./ingredients";

// Erfundene Beispielzeilen, keine echten Familienrezepte
describe("parseIngredientLine", () => {
  it("zerlegt Menge, Einheit und Name", () => {
    expect(parseIngredientLine("200 g Mehl")).toEqual({ quantity: 200, quantityMax: null, unit: "g", name: "Mehl" });
    expect(parseIngredientLine("1 Prise Salz")).toEqual({ quantity: 1, quantityMax: null, unit: "Prise", name: "Salz" });
  });

  it("erkennt Einheiten auch ohne Leerzeichen und vereinheitlicht die Schreibweise", () => {
    expect(parseIngredientLine("500ml Milch")).toEqual({ quantity: 500, quantityMax: null, unit: "ml", name: "Milch" });
    expect(parseIngredientLine("2 el Öl")).toEqual({ quantity: 2, quantityMax: null, unit: "EL", name: "Öl" });
    expect(parseIngredientLine("1 Tl. Zucker")).toEqual({ quantity: 1, quantityMax: null, unit: "TL", name: "Zucker" });
    expect(parseIngredientLine("1 Pck. Backpulver")).toEqual({ quantity: 1, quantityMax: null, unit: "Pck.", name: "Backpulver" });
  });

  it("lässt die Einheit weg, wenn keine bekannte folgt", () => {
    expect(parseIngredientLine("3 Eier")).toEqual({ quantity: 3, quantityMax: null, unit: null, name: "Eier" });
    // "gelbe" beginnt mit "g", ist aber keine Einheit
    expect(parseIngredientLine("1 gelbe Paprika")).toEqual({ quantity: 1, quantityMax: null, unit: null, name: "gelbe Paprika" });
  });

  it("versteht Komma, Brüche und gemischte Zahlen", () => {
    expect(parseIngredientLine("1,5 kg Kartoffeln").quantity).toBe(1.5);
    expect(parseIngredientLine("½ TL Pfeffer").quantity).toBe(0.5);
    expect(parseIngredientLine("1/2 Zitrone").quantity).toBe(0.5);
    expect(parseIngredientLine("1 1/2 Tassen Reis")).toEqual({ quantity: 1.5, quantityMax: null, unit: "Tassen", name: "Reis" });
    expect(parseIngredientLine("1½ EL Senf").quantity).toBe(1.5);
  });

  it("versteht gemischte Zahlen mit Leerzeichen vor dem Bruchzeichen", () => {
    expect(parseIngredientLine("1 ½ EL Honig")).toEqual({ quantity: 1.5, quantityMax: null, unit: "EL", name: "Honig" });
    expect(parseIngredientLine("2 ¼ l Brühe").quantity).toBe(2.25);
  });

  it("liest den deutschen Tausenderpunkt nicht als Komma", () => {
    expect(parseIngredientLine("1.500 g Mehl")).toEqual({ quantity: 1500, quantityMax: null, unit: "g", name: "Mehl" });
    expect(parseIngredientLine("1.000 ml Wasser").quantity).toBe(1000);
    expect(parseIngredientLine("1.5 kg Kartoffeln").quantity).toBe(1.5); // Punkt mit 1–2 Ziffern bleibt Dezimal
  });

  it("versteht Spannen wie 2-3", () => {
    expect(parseIngredientLine("2-3 Zehen Knoblauch")).toEqual({ quantity: 2, quantityMax: 3, unit: "Zehen", name: "Knoblauch" });
    expect(parseIngredientLine("2 – 3 Karotten")).toEqual({ quantity: 2, quantityMax: 3, unit: null, name: "Karotten" });
  });

  it("lässt Zeilen ohne Zahl unverändert", () => {
    expect(parseIngredientLine("Salz und Pfeffer")).toEqual({ quantity: null, quantityMax: null, unit: null, name: "Salz und Pfeffer" });
    expect(parseIngredientLine("  etwas Öl  ")).toEqual({ quantity: null, quantityMax: null, unit: null, name: "etwas Öl" });
  });

  it("überspringt ca./circa/etwa/ungefähr vor einer Zahl", () => {
    const zorbel = { quantity: 200, quantityMax: null, unit: "g", name: "Zorbel" };
    expect(parseIngredientLine("ca. 200 g Zorbel")).toEqual(zorbel);
    expect(parseIngredientLine("Ca 200 g Zorbel")).toEqual(zorbel);
    expect(parseIngredientLine("circa 200 g Zorbel")).toEqual(zorbel);
    expect(parseIngredientLine("etwa 200 g Zorbel")).toEqual(zorbel);
    expect(parseIngredientLine("ungefähr 2-3 Quimben")).toEqual({ quantity: 2, quantityMax: 3, unit: null, name: "Quimben" });
  });

  it("lässt ca./etwa ohne folgende Zahl stehen", () => {
    expect(parseIngredientLine("etwa eine Handvoll Plimme").name).toBe("etwa eine Handvoll Plimme");
    expect(parseIngredientLine("Cafeplimme").name).toBe("Cafeplimme");
  });

  it("behält eine Zahl ohne Namen als Namen, damit nichts verloren geht", () => {
    expect(parseIngredientLine("200 g")).toEqual({ quantity: null, quantityMax: null, unit: null, name: "200 g" });
  });
});

describe("formatIngredient", () => {
  it("setzt die Zeile wieder zusammen", () => {
    expect(formatIngredient({ quantity: 200, quantityMax: null, unit: "g", name: "Mehl" })).toBe("200 g Mehl");
    expect(formatIngredient({ quantity: 1.5, quantityMax: null, unit: "EL", name: "Senf" })).toBe("1½ EL Senf");
    expect(formatIngredient({ quantity: 2, quantityMax: 3, unit: null, name: "Karotten" })).toBe("2–3 Karotten");
    expect(formatIngredient({ quantity: null, quantityMax: null, unit: null, name: "Salz" })).toBe("Salz");
  });

  it("ergibt beim erneuten Zerlegen dasselbe (Bearbeiten verändert nichts)", () => {
    for (const line of ["200 g Mehl", "1½ EL Senf", "2–3 Zehen Knoblauch", "1,5 kg Kartoffeln", "Salz", "⅓ TL Zimt", "1⅔ Tassen Milch", "1500 g Mehl"]) {
      expect(formatIngredient(parseIngredientLine(line))).toBe(line);
    }
  });
});

describe("Zwischenüberschriften (Zutatengruppen)", () => {
  it("erkennt eine Zeile mit Doppelpunkt am Ende und ohne Menge als Überschrift", () => {
    expect(parseIngredientLine("Für die Soße:")).toEqual({ quantity: null, quantityMax: null, unit: null, name: "Für die Soße", heading: true });
    expect(parseIngredientLine("  Teig :  ")).toEqual({ quantity: null, quantityMax: null, unit: null, name: "Teig", heading: true });
  });

  it("macht aus Zeilen mit Menge oder ohne Doppelpunkt keine Überschrift", () => {
    expect(parseIngredientLine("2 EL Öl:").heading).toBeUndefined();
    expect(parseIngredientLine("Salz und Pfeffer").heading).toBeUndefined();
    expect(parseIngredientLine(":").heading).toBeUndefined(); // nur ein Doppelpunkt bleibt Text
  });

  it("schreibt eine Überschrift mit Doppelpunkt zurück ins Formular", () => {
    expect(formatIngredient({ quantity: null, quantityMax: null, unit: null, name: "Für die Soße", heading: true })).toBe("Für die Soße:");
  });
});
