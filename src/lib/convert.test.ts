import { describe, it, expect } from "vitest";
import {
  checkStep,
  formatSettings,
  formatTm6Time,
  parseTm6Time,
  toVariant,
  variantInputSchema,
  type AirfryerSettings,
  type Tm6Settings,
} from "./convert";

const tm6 = (s: Partial<Tm6Settings> = {}): Tm6Settings => ({ seconds: 300, temperature: 100, varoma: false, speed: "1", reverse: false, ...s });
const air = (s: Partial<AirfryerSettings> = {}): AirfryerSettings => ({ program: "air_fry", zone: "zone1", temperature: 180, minutes: 15, ...s });

describe("parseTm6Time / formatTm6Time", () => {
  it("versteht Minuten, Minuten:Sekunden und Sekunden", () => {
    expect(parseTm6Time("5")).toBe(300);
    expect(parseTm6Time("1:30")).toBe(90);
    expect(parseTm6Time("0:10")).toBe(10);
    expect(parseTm6Time("10 Sek.")).toBe(10);
    expect(parseTm6Time("2,5")).toBe(150);
    expect(parseTm6Time("")).toBeNull();
    expect(parseTm6Time("abc")).toBeNull();
    expect(parseTm6Time("1:75")).toBeNull(); // Sekunden über 59
  });

  it("schreibt Zeiten so, wie sie im TM6-Display stehen", () => {
    expect(formatTm6Time(300)).toBe("5:00");
    expect(formatTm6Time(90)).toBe("1:30");
    expect(formatTm6Time(10)).toBe("0:10");
  });
});

describe("formatSettings", () => {
  it("fasst TM6-Einstellungen wie im Kochbuch zusammen", () => {
    expect(formatSettings("tm6", tm6())).toBe("5 Min. · 100 °C · Stufe 1");
    expect(formatSettings("tm6", tm6({ seconds: 10, temperature: null, speed: "5" }))).toBe("10 Sek. · Stufe 5");
    expect(formatSettings("tm6", tm6({ seconds: 90, temperature: null, varoma: true, speed: "0.5", reverse: true }))).toBe(
      "1 Min. 30 Sek. · Varoma · Linkslauf · Stufe 0,5",
    );
    expect(formatSettings("tm6", tm6({ temperature: null, speed: "teig", seconds: 120 }))).toBe("2 Min. · Teigknetstufe");
  });

  it("fasst Heißluft-Einstellungen zusammen", () => {
    expect(formatSettings("airfryer", air())).toBe("Air Fry · Zone 1 · 180 °C · 15 Min.");
    expect(formatSettings("airfryer", air({ program: "max_crisp", zone: "megazone", temperature: 240, minutes: 8 }))).toBe(
      "Max Crisp · MegaZone · 240 °C · 8 Min.",
    );
  });
});

describe("checkStep", () => {
  it("akzeptiert realistische Werte ohne Meldung", () => {
    expect(checkStep("tm6", tm6())).toEqual({ errors: [], warnings: [] });
    expect(checkStep("airfryer", air())).toEqual({ errors: [], warnings: [] });
    expect(checkStep("tm6", null)).toEqual({ errors: [], warnings: [] }); // Schritt ohne Gerät
  });

  it("lehnt Werte außerhalb dessen ab, was das Gerät kann", () => {
    for (const bad of [
      tm6({ temperature: 130 }),
      tm6({ temperature: 30 }),
      tm6({ seconds: 100 * 60 }),
      tm6({ seconds: 0 }),
      tm6({ speed: "11" }),
      tm6({ speed: "0.7" }),
      tm6({ varoma: true, temperature: 100 }), // Varoma ODER Temperatur
    ]) {
      expect(checkStep("tm6", bad).errors.length, JSON.stringify(bad)).toBeGreaterThan(0);
    }
    for (const bad of [air({ temperature: 250 }), air({ temperature: 30 }), air({ minutes: 0 }), air({ minutes: 800 })]) {
      expect(checkStep("airfryer", bad).errors.length, JSON.stringify(bad)).toBeGreaterThan(0);
    }
  });

  it("warnt bei ungewöhnlichen Kombinationen, ohne zu blockieren", () => {
    const hotFast = checkStep("tm6", tm6({ temperature: 100, speed: "8" }));
    expect(hotFast.errors).toEqual([]);
    expect(hotFast.warnings[0]).toMatch(/Spritz/);

    const coldAirFry = checkStep("airfryer", air({ temperature: 60 }));
    expect(coldAirFry.errors).toEqual([]);
    expect(coldAirFry.warnings.length).toBe(1);

    expect(checkStep("airfryer", air({ program: "dehydrate", temperature: 60, minutes: 480 })).warnings).toEqual([]);
    expect(checkStep("airfryer", air({ minutes: 120 })).warnings.length).toBe(1);
  });
});

describe("toVariant", () => {
  it("übernimmt Schritte und Kurzhinweis", () => {
    const result = toVariant({
      possible: true,
      reason: null,
      hint: " 15 Min. bei 180 °C ",
      steps: [
        { text: " Kartoffeln schneiden. ", settings: null },
        { text: "Garen.", settings: air() },
      ],
    });
    expect(result).toEqual({
      ok: true,
      variant: {
        hint: "15 Min. bei 180 °C",
        steps: [
          { text: "Kartoffeln schneiden.", settings: null },
          { text: "Garen.", settings: air() },
        ],
      },
    });
  });

  it("zeigt den Grund, wenn das Gerät nicht passt, statt etwas zu erfinden", () => {
    const result = toVariant({ possible: false, reason: "Suppe ist in der Heißluftfritteuse nicht sinnvoll.", hint: null, steps: [] });
    expect(result).toEqual({ ok: false, error: "Suppe ist in der Heißluftfritteuse nicht sinnvoll." });
    const noSteps = toVariant({ possible: true, reason: null, hint: null, steps: [{ text: "  ", settings: null }] });
    expect(noSteps.ok).toBe(false);
  });

  it("kürzt auf die Grenzen des Formulars", () => {
    const result = toVariant({
      possible: true,
      reason: null,
      hint: "H".repeat(300),
      steps: Array.from({ length: 60 }, () => ({ text: "x".repeat(2100), settings: null })),
    });
    expect(result.ok && result.variant.hint).toHaveLength(200);
    expect(result.ok && result.variant.steps).toHaveLength(50);
    expect(result.ok && result.variant.steps[0].text).toHaveLength(2000);
  });
});

describe("variantInputSchema", () => {
  it("prüft die Struktur beim Speichern je Gerät", () => {
    const ok = { hint: "", steps: [{ text: "Garen.", settings: air() }] };
    expect(variantInputSchema("airfryer").safeParse(ok).success).toBe(true);
    expect(variantInputSchema("tm6").safeParse(ok).success).toBe(false); // Heißluft-Werte passen nicht zum TM6
    expect(variantInputSchema("airfryer").safeParse({ hint: "", steps: [] }).success).toBe(false);
  });
});
