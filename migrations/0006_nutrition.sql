-- Spec 07: Nährwerte pro Portion.
-- Quelle: Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0, CC BY 4.0 (ADR-004).
-- Befüllt über scripts/import-bls.mjs, Werte je 100 g essbarer Anteil.
CREATE TABLE bls_foods (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  search TEXT NOT NULL, -- Name klein, ohne Umlaute, Wörter mit Leerzeichen (wie tokenize in allergens.ts)
  kcal REAL NOT NULL,
  protein REAL NOT NULL,
  fat REAL NOT NULL,
  carbs REAL NOT NULL, -- Kohlenhydrate, verfügbar
  sugar REAL NOT NULL  -- davon Zucker (Mono- und Disaccharide)
);

-- Zuordnung Zutatenname → BLS-Eintrag, für die ganze Familie (ingredient_key aus src/lib/allergens.ts).
-- bls_code NULL + skip = 1: Zutat zählt nicht mit (Wasser, Salz nach Geschmack).
-- grams: JSON, Gramm je Einheit, z. B. {"": 60, "EL": 10, "ml": 0.92}. "" = Stück ohne Einheit, "ml" gilt auch für cl/dl/l.
CREATE TABLE ingredient_nutrition (
  ingredient_key TEXT PRIMARY KEY,
  bls_code TEXT REFERENCES bls_foods(code),
  skip INTEGER NOT NULL DEFAULT 0,
  grams TEXT NOT NULL DEFAULT '{}',
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
