-- Spec 04: Zutatengruppen als Zwischenüberschriften und freie Quellenangabe.

-- 1 = Zwischenüberschrift wie "Für die Soße" (ohne Menge, wird nicht umgerechnet)
ALTER TABLE ingredients ADD COLUMN is_heading INTEGER NOT NULL DEFAULT 0 CHECK (is_heading IN (0, 1));

-- Freie Quelle, z. B. "Buch Familienküche, S. 42" oder "Sendung vom 3.11." (Link bleibt in source_url)
ALTER TABLE recipes ADD COLUMN source_note TEXT;
