import { describe, it, expect } from "vitest";
import { cleanSynonyms, synonymNameSchema } from "./synonyms";

// Erfundene Begriffe, echte Allergene stehen nur in D1.
describe("cleanSynonyms", () => {
  it("trimmt, entfernt Leeres, Dubletten, den Namen selbst und schon eingetragene", () => {
    expect(cleanSynonyms(["  Plimm ", "plimm", "", "Zorbel", "Zorbeln", "Quimbe", "Narx"], "Zorbel", ["Narx"])).toEqual(["Plimm", "Quimbe"]);
  });

  it("begrenzt auf 12 und auf 60 Zeichen je Begriff", () => {
    const many = Array.from({ length: 20 }, (_, i) => `Begriff${i}`);
    expect(cleanSynonyms(many, "Zorbel", [])).toHaveLength(12);
    expect(cleanSynonyms(["x".repeat(61), "Plimm"], "Zorbel", [])).toEqual(["Plimm"]);
  });
});

describe("synonymNameSchema", () => {
  it("verlangt einen Begriff mit Buchstaben", () => {
    expect(synonymNameSchema.safeParse(" Zorbel ").data).toBe("Zorbel");
    expect(synonymNameSchema.safeParse("---").success).toBe(false);
    expect(synonymNameSchema.safeParse("").success).toBe(false);
  });
});
