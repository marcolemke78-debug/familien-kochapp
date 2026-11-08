import { describe, expect, it } from "vitest";
import { bringDeeplinkUrl, isExportToken, newExportToken, recipeJsonLd, shareText } from "./bring";
import type { Ingredient } from "./ingredients";

// Nur erfundene Lebensmittel (siehe CLAUDE.md, Datenschutz)
const ing = (quantity: number | null, unit: string | null, name: string): Ingredient => ({ quantity, quantityMax: null, unit, name });
const heading: Ingredient = { quantity: null, quantityMax: null, unit: null, name: "Für die Soße", heading: true };

describe("recipeJsonLd", () => {
  it("nur Titel, Portionen und Zutatenzeilen, ohne Überschriften", () => {
    const json = recipeJsonLd("Zorbelauflauf", 4, [heading, ing(200, "g", "Zorbeln"), ing(null, null, "Quimbe nach Geschmack")]);
    expect(JSON.parse(json)).toEqual({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Zorbelauflauf",
      recipeYield: "4",
      recipeIngredient: ["200 g Zorbeln", "Quimbe nach Geschmack"],
    });
  });

  it("kann nicht aus dem script-Block ausbrechen", () => {
    const json = recipeJsonLd("</script><b>Plimme", 2, []);
    expect(json).not.toContain("<");
    expect(JSON.parse(json).name).toBe("</script><b>Plimme");
  });
});

describe("bringDeeplinkUrl", () => {
  it("übergibt Export-Adresse und Portionen an die Bring-Schnittstelle", () => {
    const url = new URL(bringDeeplinkUrl("https://koch.example/bring/abc", 4, 6));
    expect(url.origin + url.pathname).toBe("https://api.getbring.com/rest/bringrecipes/deeplink");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      url: "https://koch.example/bring/abc",
      source: "web",
      baseQuantity: "4",
      requestedQuantity: "6",
    });
  });
});

describe("shareText", () => {
  it("Titel mit Portionen, dann eine Zeile je Zutat, umgerechnet", () => {
    expect(shareText("Zorbelauflauf", [heading, ing(200, "g", "Zorbeln"), ing(null, null, "Quimbe")], 2, 4)).toBe(
      "Zorbelauflauf (4 Portionen)\n- 400 g Zorbeln\n- Quimbe",
    );
  });

  it("eine Portion in der Einzahl", () => {
    expect(shareText("Plimme", [ing(2, null, "Quimben")], 2, 1)).toBe("Plimme (1 Portion)\n- 1 Quimben");
  });
});

describe("Export-Token", () => {
  it("32 Hex-Zeichen, zufällig", () => {
    const a = newExportToken();
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(newExportToken()).not.toBe(a);
  });

  it("isExportToken lässt nur gültige Tokens durch", () => {
    expect(isExportToken(newExportToken())).toBe(true);
    expect(isExportToken("abc")).toBe(false);
    expect(isExportToken("../../etc")).toBe(false);
    expect(isExportToken("A".repeat(32))).toBe(false);
  });
});
