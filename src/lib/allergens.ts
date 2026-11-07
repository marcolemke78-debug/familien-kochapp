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

/** Passt ein einzelnes Wort zum Begriff (Plural, zusammengesetztes Wort)? */
function wordMatches(word: string, term: string): boolean {
  return PLURAL_SUFFIXES.some((suffix) => {
    const form = term + suffix;
    return word === form || word.endsWith(form) || (term.length >= MIN_PREFIX_LENGTH && word.startsWith(term));
  });
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
