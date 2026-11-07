// Bekannte Einheiten und ihre Rundungsgruppe für den Portionen-Regler.
// Abkürzungen werden vereinheitlicht ("el" -> "EL"), Wörter behalten ihre Schreibweise ("Zehen").

export type UnitGroup = "metricSmall" | "metricLarge" | "quarter" | "half";

// Schlüssel: kleingeschrieben, ohne Punkt am Ende. Wert: Schreibweise in der App (null = so lassen, wie getippt)
const CANONICAL: Record<string, string | null> = {
  g: "g", gr: "g", gramm: "g",
  mg: "mg",
  kg: "kg", kilogramm: "kg",
  ml: "ml",
  cl: "cl",
  dl: "dl",
  l: "l", liter: "l",
  el: "EL", essl: "EL", "esslöffel": "EL",
  tl: "TL", teel: "TL", "teelöffel": "TL",
  msp: "Msp.", messerspitze: null, messerspitzen: null,
  pck: "Pck.", pkg: "Pck.", packung: null, packungen: null, "päckchen": null,
  prise: null, prisen: null,
  tasse: null, tassen: null,
  tropfen: null, spritzer: null, schuss: null,
  dose: null, dosen: null,
  bund: null,
  zehe: null, zehen: null,
  scheibe: null, scheiben: null,
  becher: null,
  glas: null, "gläser": null,
  "stück": null, stk: "Stk.",
  handvoll: null,
  zweig: null, zweige: null,
  blatt: null, "blätter": null,
  "würfel": null,
  stange: null, stangen: null,
  kopf: null, "köpfe": null,
  knolle: null, knollen: null,
  kugel: null, kugeln: null,
};

const GROUPS: Record<string, UnitGroup> = {
  g: "metricSmall", mg: "metricSmall", ml: "metricSmall",
  kg: "metricLarge", l: "metricLarge", cl: "metricLarge", dl: "metricLarge",
  el: "quarter", tl: "quarter", msp: "quarter", messerspitze: "quarter", messerspitzen: "quarter",
  prise: "quarter", prisen: "quarter", tasse: "quarter", tassen: "quarter",
  tropfen: "quarter", spritzer: "quarter", schuss: "quarter",
};

function key(word: string): string {
  return word.toLowerCase().replace(/\.$/, "");
}

// Liefert die Einheit in App-Schreibweise oder null, wenn das Wort keine bekannte Einheit ist
export function normalizeUnit(word: string): string | null {
  const k = key(word);
  if (!(k in CANONICAL)) return null;
  return CANONICAL[k] ?? word;
}

export function unitGroup(unit: string | null): UnitGroup {
  if (!unit) return "half";
  return GROUPS[key(unit)] ?? "half";
}
