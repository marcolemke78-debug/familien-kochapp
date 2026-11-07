import { describe, it, expect } from "vitest";
import { scaleQuantity, formatQuantity, scaleIngredient } from "./scale";

describe("scaleQuantity (Küchen-Rundung)", () => {
  it("rundet g und ml unter 10 auf 1, unter 100 auf 5, ab 100 auf 10", () => {
    expect(scaleQuantity(3, "g", 0.5)).toBe(2); // 1,5 -> 2
    expect(scaleQuantity(30, "g", 1.5)).toBe(45);
    expect(scaleQuantity(40, "ml", 1 / 3)).toBe(15); // 13,3 -> 15
    expect(scaleQuantity(200, "g", 1 / 3)).toBe(65); // 66,7 -> 65 (unter 100 -> 5er-Schritt)
    expect(scaleQuantity(250, "g", 1.5)).toBe(380); // 375 -> 380
  });

  it("rundet kg und l auf 0,05", () => {
    expect(scaleQuantity(1.25, "kg", 1.5)).toBe(1.9); // 1,875 -> 1,9
    expect(scaleQuantity(1, "l", 1 / 3)).toBe(0.35); // 0,333 -> 0,35
  });

  it("rundet Löffel, Prisen und Tassen auf ¼", () => {
    expect(scaleQuantity(1, "EL", 1.5)).toBe(1.5);
    expect(scaleQuantity(2, "TL", 1 / 3)).toBe(0.75); // 0,667 -> 0,75
  });

  it("rundet Stück, Packungen und Mengen ohne Einheit auf ½", () => {
    expect(scaleQuantity(1, null, 5 / 3)).toBe(1.5); // 1,67 Eier -> 1½
    expect(scaleQuantity(3, null, 1 / 3)).toBe(1);
    expect(scaleQuantity(1, "Dose", 1.5)).toBe(1.5);
  });

  it("rundet nie auf 0", () => {
    expect(scaleQuantity(1, "g", 0.25)).toBe(1);
    expect(scaleQuantity(1, "EL", 0.1)).toBe(0.25);
    expect(scaleQuantity(1, null, 0.1)).toBe(0.5);
    expect(scaleQuantity(0.1, "kg", 0.25)).toBe(0.05);
  });

  it("lässt die Menge beim Faktor 1 exakt so, wie sie im Rezept steht", () => {
    expect(scaleQuantity(0.33, null, 1)).toBe(0.33);
    expect(scaleQuantity(123, "g", 1)).toBe(123);
  });
});

describe("formatQuantity", () => {
  it("zeigt ¼, ½ und ¾ als Bruch bei Löffeln und Stück", () => {
    expect(formatQuantity(1.5, "EL")).toBe("1½");
    expect(formatQuantity(0.25, "TL")).toBe("¼");
    expect(formatQuantity(2.75, null)).toBe("2¾");
    expect(formatQuantity(3, null)).toBe("3");
  });

  it("zeigt Dezimalzahlen mit Komma, bei g/kg/ml/l immer", () => {
    expect(formatQuantity(1.5, "kg")).toBe("1,5");
    expect(formatQuantity(0.35, "l")).toBe("0,35");
    expect(formatQuantity(0.4, null)).toBe("0,4");
    expect(formatQuantity(1 / 3, "TL")).toBe("⅓"); // Drittel als Bruch, nur bei Löffeln/Stück
  });
});

describe("scaleIngredient", () => {
  it("rechnet Spannen und lässt Zutaten ohne Zahl unverändert", () => {
    expect(scaleIngredient({ quantity: 2, quantityMax: 3, unit: "Zehen", name: "Knoblauch" }, 2)).toEqual({
      quantity: 4,
      quantityMax: 6,
      unit: "Zehen",
      name: "Knoblauch",
    });
    const salt = { quantity: null, quantityMax: null, unit: null, name: "Salz nach Geschmack" };
    expect(scaleIngredient(salt, 3)).toEqual(salt);
  });
});
describe("scaleIngredient bei Überschriften", () => {
  it("lässt Überschriften unverändert", () => {
    const heading = { quantity: null, quantityMax: null, unit: null, name: "Für den Teig", heading: true as const };
    expect(scaleIngredient(heading, 2)).toEqual(heading);
  });
});
