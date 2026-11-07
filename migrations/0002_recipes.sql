-- Spec 02: Rezepte mit Zutaten, Schritten, Kategorien und Geräten.
-- Die erlaubten Werte in den CHECK-Regeln entsprechen src/lib/recipe-meta.ts.

CREATE TABLE recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id TEXT NOT NULL UNIQUE,      -- vom Formular erzeugt: Doppelklick legt kein zweites Rezept an
  title TEXT NOT NULL,
  description TEXT,
  servings INTEGER NOT NULL DEFAULT 4 CHECK (servings BETWEEN 1 AND 50),
  prep_minutes INTEGER CHECK (prep_minutes IS NULL OR prep_minutes BETWEEN 1 AND 1440),
  source_url TEXT,                     -- z. B. Cookidoo: nur der Link, nie der Text
  photo_key TEXT,                      -- Dateiname in R2, NULL = Platzhalter
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX recipes_created_at ON recipes (created_at DESC);

CREATE TABLE ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  quantity REAL,                       -- NULL = ohne Zahl ("Salz nach Geschmack")
  quantity_max REAL,                   -- nur bei Spannen wie "2–3"
  unit TEXT,
  name TEXT NOT NULL
);

CREATE INDEX ingredients_recipe ON ingredients (recipe_id, position);

CREATE TABLE steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  text TEXT NOT NULL
);

CREATE INDEX steps_recipe ON steps (recipe_id, position);

-- Mahlzeiten und Merkmale, mehrere pro Rezept möglich
CREATE TABLE recipe_tags (
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag TEXT NOT NULL CHECK (tag IN (
    'fruehstueck', 'hauptmahlzeit', 'abend', 'zwischendurch', 'backen',
    'schnell', 'guenstig', 'vorbereiten'
  )),
  PRIMARY KEY (recipe_id, tag)
);

CREATE INDEX recipe_tags_tag ON recipe_tags (tag);

-- Geht das Rezept im TM6 / in der Heißluftfritteuse, und wie sicher ist das?
CREATE TABLE recipe_devices (
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  device TEXT NOT NULL CHECK (device IN ('tm6', 'airfryer')),
  status TEXT NOT NULL DEFAULT 'original' CHECK (status IN ('original', 'ki', 'getestet')),
  hint TEXT,                           -- z. B. "20 Min. / 100 °C / Stufe 1"
  PRIMARY KEY (recipe_id, device)
);
