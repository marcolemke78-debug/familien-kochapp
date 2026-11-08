-- Spec 10: TM6 und Heißluft zusammen. Eigene Tabellen, recipe_devices bleibt unverändert.
-- Nur hinzufügend: keine bestehende Tabelle oder Spalte wird geändert.

-- Eine Kombi-Planung je Rezept. Ist recipes.updated_at neuer als converted_at, zeigt die App "Original wurde geändert".
CREATE TABLE combo_plans (
  recipe_id INTEGER PRIMARY KEY REFERENCES recipes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ki' CHECK (status IN ('ki', 'getestet')),
  benefit TEXT NOT NULL,               -- ein Satz: was die Kombi bringt
  converted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Schritte in Küchen-Reihenfolge. device NULL = ohne Gerät, settings = JSON passend zum Gerät (src/lib/combo.ts).
-- parallel = 1: läuft gleichzeitig mit dem Schritt davor.
CREATE TABLE combo_steps (
  recipe_id INTEGER NOT NULL REFERENCES combo_plans(recipe_id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  device TEXT CHECK (device IN ('tm6', 'airfryer')),
  settings TEXT,
  parallel INTEGER NOT NULL DEFAULT 0 CHECK (parallel IN (0, 1)),
  PRIMARY KEY (recipe_id, position)
);
