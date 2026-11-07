import { describe, it, expect } from "vitest";
import { parseFilters, buildFilterSql, filterHref, hasFilters, EMPTY_FILTERS } from "./recipe-query";

describe("parseFilters", () => {
  it("liest Mahlzeit, Merkmal, Gerät und Suchtext aus der URL", () => {
    expect(parseFilters({ mahlzeit: "abend,fruehstueck", merkmal: "schnell", geraet: "airfryer", q: "  Nudeln " })).toEqual({
      meals: ["abend", "fruehstueck"],
      traits: ["schnell"],
      devices: ["airfryer"],
      q: "Nudeln",
    });
  });

  it("ignoriert unbekannte Werte und doppelte Angaben ohne Fehler", () => {
    expect(parseFilters({ mahlzeit: "abend,gibtsnicht,abend", merkmal: "schnell", geraet: "mikrowelle", foo: "bar" })).toEqual({
      meals: ["abend"],
      traits: ["schnell"],
      devices: [],
      q: "",
    });
  });

  it("verträgt mehrfach angegebene Parameter und Unsinn", () => {
    expect(parseFilters({ mahlzeit: ["abend", "backen"], q: ["a", "b"] })).toMatchObject({ meals: ["abend", "backen"], q: "a" });
    expect(parseFilters({ merkmal: "abend" }).traits).toEqual([]); // Mahlzeit im falschen Feld
    expect(parseFilters({ q: "x".repeat(500) }).q).toHaveLength(100);
  });
});

describe("buildFilterSql", () => {
  it("liefert ohne Filter keine Bedingung", () => {
    expect(buildFilterSql(EMPTY_FILTERS)).toEqual({ where: "", params: [] });
  });

  it("verknüpft Gruppen mit UND und Werte innerhalb einer Gruppe mit ODER", () => {
    const { where, params } = buildFilterSql({ meals: ["abend", "backen"], traits: ["schnell"], devices: ["tm6"], q: "" });
    expect(where.match(/ AND /g)?.length).toBeGreaterThanOrEqual(2);
    expect(where).toContain("IN (?, ?)");
    expect(params).toEqual(["abend", "backen", "schnell", "tm6"]);
  });

  it("sucht in Titel und Zutaten, auch mit großem Anfangsbuchstaben bei Umlauten", () => {
    const { where, params } = buildFilterSql({ meals: [], traits: [], devices: [], q: "öl" });
    expect(where).toContain("LIKE");
    expect(params).toEqual(["%öl%", "%Öl%", "%öl%", "%Öl%"]);
  });

  it("behandelt % und _ im Suchtext als normale Zeichen und baut nie Nutzertext ins SQL ein", () => {
    const { where, params } = buildFilterSql({ meals: [], traits: [], devices: [], q: "50%_'; DROP TABLE recipes;--" });
    expect(where).not.toContain("DROP");
    expect(params[0]).toBe("%50\\%\\_'; drop table recipes;--%"); // kleingeschrieben, Platzhalter entschärft
  });
});

describe("filterHref", () => {
  it("schaltet einen Chip an und aus und behält die übrigen Filter", () => {
    const current = { meals: ["abend" as const], traits: [], devices: [], q: "nudel" };
    expect(filterHref(current, "devices", "tm6")).toBe("/?mahlzeit=abend&geraet=tm6&q=nudel");
    expect(filterHref(current, "meals", "abend")).toBe("/?q=nudel");
    expect(filterHref(EMPTY_FILTERS, "meals", "abend")).toBe("/?mahlzeit=abend");
  });

  it("erkennt, ob Filter aktiv sind", () => {
    expect(hasFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasFilters({ ...EMPTY_FILTERS, q: "x" })).toBe(true);
  });
});
