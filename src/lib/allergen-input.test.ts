import { describe, it, expect } from "vitest";
import { parseAllergenForm } from "./allergen-input";

// Erfundene Allergene, echte stehen nur in D1.
function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

describe("parseAllergenForm", () => {
  it("liefert Name, Synonyme und Modus sauber getrimmt", () => {
    expect(parseAllergenForm(form({ name: "  Zorbel ", synonyms: " Zorbelmus, Plimm-Aufstrich ,, ", mode: "raw_only" }))).toEqual({
      success: true,
      data: { name: "Zorbel", synonyms: ["Zorbelmus", "Plimm-Aufstrich"], mode: "raw_only" },
    });
  });

  it("nimmt ohne Angabe Modus 'immer' und keine Synonyme", () => {
    expect(parseAllergenForm(form({ name: "Quimbe" }))).toEqual({ success: true, data: { name: "Quimbe", synonyms: [], mode: "always" } });
  });

  it("entfernt doppelte Synonyme (ohne Groß-/Kleinschreibung) und das Synonym gleich dem Namen", () => {
    const result = parseAllergenForm(form({ name: "Zorbel", synonyms: "zorbel, Plimm, plimm" }));
    expect(result.success && result.data.synonyms).toEqual(["Plimm"]);
  });

  it("meldet fehlenden Namen, unbekannten Modus und zu viele Synonyme", () => {
    expect(parseAllergenForm(form({ name: "  " }))).toMatchObject({ success: false, fieldErrors: { name: expect.any(String) } });
    expect(parseAllergenForm(form({ name: "Zorbel", mode: "manchmal" }))).toMatchObject({ success: false, fieldErrors: { mode: expect.any(String) } });
    const many = Array.from({ length: 31 }, (_, i) => `Begriff${i}`).join(",");
    expect(parseAllergenForm(form({ name: "Zorbel", synonyms: many }))).toMatchObject({ success: false, fieldErrors: { synonyms: expect.any(String) } });
  });

  it("lehnt Begriffe ohne Buchstaben ab, weil sie nie etwas finden würden", () => {
    expect(parseAllergenForm(form({ name: "---" }))).toMatchObject({ success: false, fieldErrors: { name: expect.any(String) } });
  });
});
