-- Spec 08: kurzlebige Export-Adressen für Bring (/bring/<token>), ohne Login erreichbar.
-- Nur der Verweis aufs Rezept, keine Inhalte. Abgelaufene Einträge löscht die App beim nächsten Export.
CREATE TABLE bring_exports (
  token TEXT PRIMARY KEY,              -- 32 Hex-Zeichen, zufällig
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL             -- "JJJJ-MM-TT HH:MM:SS" (UTC, wie datetime('now'))
);
