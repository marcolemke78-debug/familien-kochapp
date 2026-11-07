// Abgleich von Zutaten mit den Allergie-Profilen der Familie.
// Reine Logik ohne Datenbank – die Regeln kommen aus D1 (allergen_rules).

export type AllergenMode = "always" | "raw_only";

export type AllergenRule = {
  id: number;
  userId: number; // Person (Login), der das Profil gehört
  name: string;
  synonyms: string[]; // versteckte Bestandteile, Unterbegriffe
  mode: AllergenMode;
};

// red = sicher betroffen, yellow = prüfen (z. B. unbekannt, ob roh)
export type AllergenHit = { ruleId: number; userId: number; level: "red" | "yellow" };

export type Suitability = "passt" | "mit_ersatz" | "pruefen" | "nicht_geeignet";

// Endungen für deutschen Plural (Umlaute werden vorher entfernt: Nüsse → nusse)
const PLURAL_SUFFIXES = ["", "e", "n", "en", "s", "er", "se", "nen"];
// Ab dieser Länge darf ein Begriff auch am Wortanfang stehen (Zorbelmus).
// Kürzere Begriffe nur am Wortende, sonst gibt es zu viele Fehlalarme.
const MIN_PREFIX_LENGTH = 4;

/** Kleinbuchstaben, Umlaute vereinfacht, in Wörter zerlegt */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// Kürzester Wortstamm, wenn eine Plural-Endung abgeschnitten wird ("Zorbeln" → "zorbel")
const MIN_STEM_LENGTH = 3;

/** Begriff plus mögliche Einzahl-Formen, falls im Profil die Mehrzahl steht */
function termForms(term: string): string[] {
  const stems = PLURAL_SUFFIXES.filter((suffix) => suffix && term.endsWith(suffix) && term.length - suffix.length >= MIN_STEM_LENGTH).map(
    (suffix) => term.slice(0, -suffix.length),
  );
  return [term, ...stems];
}

/** Passt ein einzelnes Wort zum Begriff (Plural, zusammengesetztes Wort)? */
function wordMatches(word: string, term: string): boolean {
  return termForms(term).some((base) =>
    PLURAL_SUFFIXES.some((suffix) => {
      const form = base + suffix;
      return word === form || word.endsWith(form) || (base.length >= MIN_PREFIX_LENGTH && word.startsWith(base));
    }),
  );
}

/** Kommt der Begriff (ein oder mehrere Wörter) im Zutatennamen vor? */
function containsTerm(words: string[], term: string): boolean {
  const termWords = tokenize(term);
  if (termWords.length === 0) return false;
  const last = termWords.length - 1;
  for (let start = 0; start + last < words.length; start++) {
    // Vordere Wörter müssen exakt passen, nur das letzte darf Plural/Zusammensetzung sein
    const ok = termWords.every((t, i) => (i === last ? wordMatches(words[start + i], t) : words[start + i] === t));
    if (ok) return true;
  }
  return false;
}

/**
 * Prüft eine Zutat gegen alle Regeln.
 * isRaw: true = roh, false = gegart, null = unbekannt (→ bei nur_roh gelb)
 */
export function checkIngredient(name: string, isRaw: boolean | null, rules: AllergenRule[]): AllergenHit[] {
  const words = tokenize(name);
  const hits: AllergenHit[] = [];
  for (const rule of rules) {
    if (![rule.name, ...rule.synonyms].some((term) => containsTerm(words, term))) continue;
    if (rule.mode === "always" || isRaw === true) hits.push({ ruleId: rule.id, userId: rule.userId, level: "red" });
    else if (isRaw === null) hits.push({ ruleId: rule.id, userId: rule.userId, level: "yellow" });
    // nur_roh + gegart: unbedenklich
  }
  return hits;
}

/** Schlüssel, über den ein Ersatz an einer Zutat hängt (substitutions.ingredient_key) */
export function ingredientKey(name: string): string {
  return tokenize(name).join(" ");
}

/**
 * Badge für die Rezeptliste. rules und approvedKeys gehören zur selben Person.
 * approvedKeys: ingredientKey() der Zutaten mit freigegebenem Ersatz.
 */
export function recipeSuitability(
  ingredients: { name: string; isRaw: boolean | null }[],
  rules: AllergenRule[],
  approvedKeys: Set<string>,
): Suitability {
  let substituted = false;
  let yellow = false;
  for (const ing of ingredients) {
    const hits = checkIngredient(ing.name, ing.isRaw, rules);
    if (hits.length === 0) continue;
    if (approvedKeys.has(ingredientKey(ing.name))) {
      substituted = true;
      continue;
    }
    if (hits.some((h) => h.level === "red")) return "nicht_geeignet";
    yellow = true;
  }
  if (yellow) return "pruefen";
  return substituted ? "mit_ersatz" : "passt";
}

export type ApprovedSubstitution = { ingredientKey: string; userId: number; replacement: string };

// "ok" = betroffen, aber jede betroffene Person hat freigegebenen Ersatz
export type IngredientMark = {
  level: "red" | "yellow" | "ok";
  // allergen/level null = kein Allergie-Treffer, nur freigegebener Ersatz ("mag ich nicht")
  people: { person: string; allergen: string | null; level: "red" | "yellow" | null; replacement: string | null }[];
};

/**
 * Markierungen für die Rezeptseite, je Zutat (gleiche Reihenfolge). null = unbedenklich oder Überschrift.
 * Zeigt alle Familienmitglieder, damit die Person, die kocht, weiß, für wen es ein Problem ist.
 */
export function markIngredients(
  ingredients: { name: string; heading?: true; raw?: boolean }[],
  rules: AllergenRule[],
  approved: ApprovedSubstitution[],
  names: Map<number, string>,
): (IngredientMark | null)[] {
  const ruleById = new Map(rules.map((r) => [r.id, r]));
  return ingredients.map((ing) => {
    if (ing.heading) return null;
    const hits = checkIngredient(ing.name, ing.raw ?? null, rules);
    const key = ingredientKey(ing.name);
    const subs = approved.filter((s) => s.ingredientKey === key);
    if (hits.length === 0) {
      if (subs.length === 0) return null;
      const people = subs.map((s) => ({ person: names.get(s.userId) ?? "Unbekannt", allergen: null, level: null, replacement: s.replacement }));
      return { level: "ok", people };
    }
    const people: IngredientMark["people"] = hits.map((hit) => ({
      person: names.get(hit.userId) ?? "Unbekannt",
      allergen: ruleById.get(hit.ruleId)?.name ?? "",
      level: hit.level,
      replacement: subs.find((s) => s.userId === hit.userId)?.replacement ?? null,
    }));
    const open = people.filter((p) => p.replacement === null);
    const level = open.length === 0 ? "ok" : open.some((p) => p.level === "red") ? "red" : "yellow";
    return { level, people };
  });
}

// Reihenfolge von gut nach schlecht
const SUITABILITY_ORDER: Suitability[] = ["passt", "mit_ersatz", "pruefen", "nicht_geeignet"];

/** Badge für die ganze Familie: je Person prüfen, der schlechteste Wert gewinnt */
export function familySuitability(
  ingredients: { name: string; isRaw: boolean | null }[],
  rules: AllergenRule[],
  approved: ApprovedSubstitution[],
): Suitability {
  let worst = 0;
  for (const userId of new Set(rules.map((r) => r.userId))) {
    const keys = new Set(approved.filter((s) => s.userId === userId).map((s) => s.ingredientKey));
    const result = recipeSuitability(ingredients, rules.filter((r) => r.userId === userId), keys);
    worst = Math.max(worst, SUITABILITY_ORDER.indexOf(result));
  }
  return SUITABILITY_ORDER[worst];
}
