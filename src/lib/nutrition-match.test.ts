import { describe, expect, it } from "vitest";
import { matchUserText, validMatches, type MatchItem } from "./nutrition-match";

// Nur erfundene Lebensmittel
const items: MatchItem[] = [
  { index: 0, line: "200 g Zorbel", unit: null, candidates: [{ code: "Z1", name: "Zorbel, roh" }] },
  { index: 1, line: "2 EL Quimbe", unit: "el", candidates: [{ code: "Q1", name: "Quimbe" }] },
  { index: 2, line: "3 Plimm", unit: "", candidates: [] },
];

describe("matchUserText", () => {
  it("listet Zutat, gefragte Einheit und Kandidaten", () => {
    const text = matchUserText(items);
    expect(text).toContain("Zutat 1: 2 EL Quimbe\nGramm je: el\nKandidaten:\n- Q1: Quimbe");
    expect(text).toContain("Gramm je: Stück");
    expect(text).toContain("- (keine)");
    expect(text).not.toMatch(/Zutat 0[^\n]*\nGramm je/);
  });
});

describe("validMatches", () => {
  it("verwirft Codes, die nicht in der Kandidatenliste stehen, und unplausible Gramm", () => {
    const output = {
      matches: [
        { index: 0, code: "Q1", skip: false, search_term: "", grams_per_unit: 0 },
        { index: 1, code: "Q1", skip: false, search_term: "", grams_per_unit: 99999 },
        { index: 2, code: null, skip: false, search_term: " Plimmling ", grams_per_unit: 60 },
      ],
    };
    expect(validMatches(output, items)).toEqual([
      { index: 0, code: null, skip: false, searchTerm: "", gramsPerUnit: null },
      { index: 1, code: "Q1", skip: false, searchTerm: "", gramsPerUnit: null },
      { index: 2, code: null, skip: false, searchTerm: "Plimmling", gramsPerUnit: 60 },
    ]);
  });

  it("skip ohne Code, fehlende Antwort = nichts vorgeschlagen", () => {
    const output = { matches: [{ index: 0, code: "Z1", skip: true, search_term: "x", grams_per_unit: 0 }] };
    const [first, second] = validMatches(output, items);
    expect(first).toEqual({ index: 0, code: null, skip: true, searchTerm: "", gramsPerUnit: null });
    expect(second).toEqual({ index: 1, code: null, skip: false, searchTerm: "", gramsPerUnit: null });
  });

  it("übernimmt Gramm nur, wenn eine Einheit gefragt war", () => {
    const output = { matches: [{ index: 0, code: "Z1", skip: false, search_term: "", grams_per_unit: 50 }] };
    expect(validMatches(output, items)[0].gramsPerUnit).toBeNull();
  });
});
