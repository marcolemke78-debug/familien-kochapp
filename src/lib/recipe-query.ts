// Filter und Suche für die Rezeptliste (Spec 03).
// Die Filter stehen in der URL (?mahlzeit=abend,backen&merkmal=schnell&geraet=tm6&q=nudel),
// damit Zurück-Taste und Lesezeichen funktionieren. Nutzertext kommt nur als gebundener Parameter ins SQL.
import { DEVICES, MEALS, TRAITS, type Device, type Tag } from "./recipe-meta";

// nutrition: Spec 07, wird nicht in SQL gefiltert, sondern nach der Berechnung in der Rezeptliste
export const NUTRITION_FILTERS = [{ value: "lowcarb", label: "Low Carb" }] as const;
export type NutritionFilter = (typeof NUTRITION_FILTERS)[number]["value"];

export type Filters = { meals: Tag[]; traits: Tag[]; devices: Device[]; nutrition: NutritionFilter[]; q: string };
type ListKey = "meals" | "traits" | "devices" | "nutrition";

export const EMPTY_FILTERS: Filters = { meals: [], traits: [], devices: [], nutrition: [], q: "" };

// Feld in der Filter-Struktur -> Name in der URL und erlaubte Werte
const GROUPS: Record<ListKey, { param: string; allowed: readonly string[] }> = {
  meals: { param: "mahlzeit", allowed: MEALS.map((m) => m.value) },
  traits: { param: "merkmal", allowed: TRAITS.map((t) => t.value) },
  devices: { param: "geraet", allowed: DEVICES.map((d) => d.value) },
  nutrition: { param: "naehrwert", allowed: NUTRITION_FILTERS.map((n) => n.value) },
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function list(value: string | string[] | undefined, allowed: readonly string[]): string[] {
  const raw = (Array.isArray(value) ? value : [value ?? ""]).flatMap((v) => v.split(","));
  return [...new Set(raw.map((v) => v.trim()).filter((v) => allowed.includes(v)))]; // Unbekanntes still ignorieren
}

export function parseFilters(sp: SearchParams): Filters {
  return {
    meals: list(sp[GROUPS.meals.param], GROUPS.meals.allowed) as Tag[],
    traits: list(sp[GROUPS.traits.param], GROUPS.traits.allowed) as Tag[],
    devices: list(sp[GROUPS.devices.param], GROUPS.devices.allowed) as Device[],
    nutrition: list(sp[GROUPS.nutrition.param], GROUPS.nutrition.allowed) as NutritionFilter[],
    q: first(sp.q).trim().slice(0, 100),
  };
}

export function hasFilters(f: Filters): boolean {
  return f.meals.length + f.traits.length + f.devices.length + f.nutrition.length > 0 || f.q !== "";
}

// % und _ sind in LIKE Platzhalter -> mit \ entschärfen
function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function placeholders(n: number): string {
  return Array.from({ length: n }, () => "?").join(", ");
}

// Baut die WHERE-Bedingung für "recipes r". Gruppen mit UND, Werte innerhalb einer Gruppe mit ODER.
export function buildFilterSql(f: Filters): { where: string; params: string[] } {
  const conditions: string[] = [];
  const params: string[] = [];

  for (const tags of [f.meals, f.traits]) {
    if (tags.length === 0) continue;
    conditions.push(`EXISTS (SELECT 1 FROM recipe_tags t WHERE t.recipe_id = r.id AND t.tag IN (${placeholders(tags.length)}))`);
    params.push(...tags);
  }
  if (f.devices.length > 0) {
    conditions.push(
      `EXISTS (SELECT 1 FROM recipe_devices d WHERE d.recipe_id = r.id AND d.device IN (${placeholders(f.devices.length)}))`,
    );
    params.push(...f.devices);
  }
  if (f.q) {
    // SQLite ignoriert Groß/klein nur bei a–z. Für Umlaute ("Öl" vs. "öl") beide Varianten suchen.
    const lower = f.q.toLowerCase();
    const capital = lower.charAt(0).toUpperCase() + lower.slice(1);
    const like = `LIKE ? ESCAPE '\\'`;
    conditions.push(
      `(r.title ${like} OR r.title ${like} OR EXISTS (SELECT 1 FROM ingredients i WHERE i.recipe_id = r.id AND (i.name ${like} OR i.name ${like})))`,
    );
    params.push(likePattern(lower), likePattern(capital), likePattern(lower), likePattern(capital));
  }

  return { where: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "", params };
}

// Link für einen Chip: schaltet `value` in der Gruppe `key` an oder aus, alle anderen Filter bleiben
export function filterHref(current: Filters, key: ListKey, value: string): string {
  const values = current[key] as string[];
  const next = { ...current, [key]: values.includes(value) ? values.filter((v) => v !== value) : [...values, value] };
  const sp = new URLSearchParams();
  for (const k of ["meals", "traits", "devices", "nutrition"] as const) {
    if (next[k].length) sp.set(GROUPS[k].param, next[k].join(","));
  }
  if (next.q) sp.set("q", next.q);
  const query = sp.toString().replaceAll("%2C", ",");
  return query ? `/?${query}` : "/";
}
