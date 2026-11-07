-- Spec 05: KI-Umrechnung für TM6 / Heißluftfritteuse als eigene Variante (Original bleibt unverändert).

-- Zeitpunkt der Umrechnung. NULL = keine Variante (z. B. Geräteangabe aus dem Original).
-- Ist recipes.updated_at neuer, zeigt die App "Original wurde geändert, Umrechnung prüfen".
ALTER TABLE recipe_devices ADD COLUMN converted_at TEXT;

-- Schritte der Geräte-Variante. settings = JSON mit Zeit/Temperatur/Stufe bzw. Programm/Zone,
-- geprüft mit src/lib/convert.ts. NULL = Schritt ohne Gerät ("Servieren").
CREATE TABLE device_steps (
  recipe_id INTEGER NOT NULL,
  device TEXT NOT NULL,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  settings TEXT,
  PRIMARY KEY (recipe_id, device, position),
  FOREIGN KEY (recipe_id, device) REFERENCES recipe_devices (recipe_id, device) ON DELETE CASCADE
);
