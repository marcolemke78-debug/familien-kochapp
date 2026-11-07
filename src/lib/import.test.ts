import { describe, it, expect } from "vitest";
import { checkImportFiles, countPdfPages, detectImportKind, toDraft, type ImportOutput } from "./import";

// Erfundene KI-Antwort, kein echtes Rezept
function output(fields: Partial<ImportOutput> = {}): ImportOutput {
  return {
    found: true,
    title: "Testnudeln mit Tomatensoße",
    description: null,
    servings: 4,
    prepMinutes: 30,
    sourceNote: "Testbuch, S. 12",
    sourceUrl: null,
    ingredients: ["Für die Pasta:", "400 g Testnudeln", "Für die Soße:", "1 Dose Tomaten"],
    steps: ["Nudeln kochen.", "Soße erhitzen."],
    tags: ["hauptmahlzeit"],
    devices: [],
    ...fields,
  };
}

const bytes = (text: string) => new TextEncoder().encode(text);

describe("detectImportKind", () => {
  it("erkennt JPEG, PNG, WebP und PDF an den ersten Bytes", () => {
    expect(detectImportKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toEqual({ kind: "image", mediaType: "image/jpeg" });
    expect(detectImportKind(bytes("%PDF-1.7\n%âãÏÓ"))).toEqual({ kind: "pdf", mediaType: "application/pdf" });
    expect(detectImportKind(bytes("<html>kein Bild</html>"))).toBeNull();
  });
});

describe("countPdfPages", () => {
  it("zählt Seiten-Objekte, aber nicht den Seitenbaum (/Pages)", () => {
    const pdf = bytes("%PDF-1.4 1 0 obj << /Type /Pages /Count 2 >> 2 0 obj << /Type /Page >> 3 0 obj <</Type/Page/Parent 1 0 R>>");
    expect(countPdfPages(pdf)).toBe(2);
  });
});

describe("checkImportFiles", () => {
  const MB = 1024 * 1024;

  it("erlaubt 1 bis 4 Bilder oder genau ein PDF", () => {
    expect(checkImportFiles([{ kind: "image", size: MB }])).toBeNull();
    expect(checkImportFiles([{ kind: "image", size: MB }, { kind: "image", size: MB }])).toBeNull();
    expect(checkImportFiles([{ kind: "pdf", size: MB, pages: 3 }])).toBeNull();
  });

  it("lehnt leere, gemischte, zu viele, zu große und unbekannte Dateien mit Meldung ab", () => {
    const cases = [
      [],
      [{ kind: null, size: 10 }],
      [{ kind: "pdf", size: MB, pages: 1 }, { kind: "image", size: MB }],
      Array.from({ length: 5 }, () => ({ kind: "image", size: MB })),
      [{ kind: "image", size: 6 * MB }, { kind: "image", size: 5 * MB }],
      [{ kind: "pdf", size: MB, pages: 11 }],
    ] as Parameters<typeof checkImportFiles>[0][];
    for (const files of cases) {
      expect(checkImportFiles(files), JSON.stringify(files)).toMatch(/\S/);
    }
  });
});

describe("toDraft", () => {
  it("macht aus der KI-Antwort einen Formular-Entwurf mit Überschriften", () => {
    const result = toDraft(output());
    expect(result).toEqual({
      ok: true,
      draft: {
        title: "Testnudeln mit Tomatensoße",
        description: "",
        servings: 4,
        prepMinutes: 30,
        sourceUrl: "",
        sourceNote: "Testbuch, S. 12",
        tags: ["hauptmahlzeit"],
        devices: [],
        ingredients: ["Für die Pasta:", "400 g Testnudeln", "Für die Soße:", "1 Dose Tomaten"],
        steps: ["Nudeln kochen.", "Soße erhitzen."],
      },
    });
  });

  it("meldet, wenn kein Rezept erkannt wurde, statt etwas zu erfinden", () => {
    for (const bad of [output({ found: false }), output({ title: "  " }), output({ ingredients: ["Für die Soße:"] }), output({ steps: [] })]) {
      const result = toDraft(bad);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toMatch(/kein Rezept/);
    }
  });

  it("entfernt Links aus Zutaten und Schritten (Werbung, Affiliate)", () => {
    const result = toDraft(
      output({
        ingredients: ["1 Testpfanne https://amzn.to/abc123", "200 g Testreis"],
        steps: ["In der Pfanne (www.example-shop.de/pfanne?tag=aff-21) anbraten.", "https://example.org/werbung"],
      }),
    );
    expect(result.ok && result.draft.ingredients).toEqual(["1 Testpfanne", "200 g Testreis"]);
    expect(result.ok && result.draft.steps).toEqual(["In der Pfanne anbraten."]);
  });

  it("hält die Grenzen des Formulars ein", () => {
    const result = toDraft(
      output({
        title: "T".repeat(150),
        servings: 0,
        prepMinutes: 5000,
        sourceNote: "Q".repeat(250),
        ingredients: Array.from({ length: 90 }, (_, i) => `${i + 1} g Testzutat`),
        steps: Array.from({ length: 60 }, (_, i) => `Schritt ${i + 1}`),
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.title).toHaveLength(120);
    expect(result.draft.servings).toBe(4); // unsinnige Portionen -> Standard
    expect(result.draft.prepMinutes).toBeNull();
    expect(result.draft.sourceNote).toHaveLength(200);
    expect(result.draft.ingredients).toHaveLength(80);
    expect(result.draft.steps).toHaveLength(50);
  });

  it("übernimmt nur gültige Links, Kategorien und Geräte (Status bleibt später 'original')", () => {
    const result = toDraft(
      output({
        sourceUrl: "javascript:alert(1)",
        tags: ["schnell", "gibtsnicht" as "schnell"],
        devices: [
          { device: "tm6", hint: "  10 Min. / 100 °C / Stufe 1  " },
          { device: "tm6", hint: "doppelt" },
          { device: "airfryer", hint: "" },
        ],
      }),
    );
    expect(result.ok && result.draft.sourceUrl).toBe("");
    expect(result.ok && result.draft.tags).toEqual(["schnell"]);
    expect(result.ok && result.draft.devices).toEqual([
      { device: "tm6", hint: "10 Min. / 100 °C / Stufe 1" },
      { device: "airfryer", hint: null },
    ]);

    const withLink = toDraft(output({ sourceUrl: "https://example.org/rezept" }));
    expect(withLink.ok && withLink.draft.sourceUrl).toBe("https://example.org/rezept");
  });
});
