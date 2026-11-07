-- Spec 06: Allergie-Profile und Ersatz-Zutaten.
-- Die konkreten Allergene stehen nur hier in D1 (über die App eingegeben), nie im Code.

-- Eine Regel gehört genau einer Person (Login). synonyms = JSON-Array mit Unterbegriffen.
-- mode: 'always' = immer unverträglich, 'raw_only' = nur roh (gegart erlaubt).
CREATE TABLE allergen_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  synonyms TEXT NOT NULL DEFAULT '[]',
  mode TEXT NOT NULL DEFAULT 'always' CHECK (mode IN ('always', 'raw_only')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX allergen_rules_user ON allergen_rules (user_id);

-- Wird die Zutat roh verwendet? 1 = roh, 0 = gegart, NULL = unbekannt (→ bei raw_only gelb).
ALTER TABLE ingredients ADD COLUMN is_raw INTEGER;

-- Ersatz für eine Zutat, je Person. Vorschlag (KI) → Freigabe nur durch diese Person.
-- Verknüpft über Rezept + Zutatenname (ingredient_key aus src/lib/allergens.ts), nicht über
-- ingredients.id: Beim Speichern eines Rezepts werden die Zutaten neu angelegt.
CREATE TABLE substitutions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_key TEXT NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  replacement TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'vorschlag' CHECK (status IN ('vorschlag', 'freigegeben')),
  approved_by INTEGER REFERENCES users(id),
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX substitutions_unique ON substitutions (recipe_id, ingredient_key, user_id);
