-- Nutzer der Familie. Angelegt beim ersten Login über Cloudflare Access.
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,          -- eine E-Mail = ein Nutzer
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
