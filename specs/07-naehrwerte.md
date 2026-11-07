# 07 — Nährwerte pro Portion

**Status:** ✅ Fertig

## Ziel

Als Familienmitglied möchte ich pro Portion Kalorien, Eiweiß, Fett, Kohlenhydrate und davon Zucker sehen, damit wir Low-Carb-Rezepte und zuckerarme Kuchen gezielt auswählen können.

## Abhängigkeiten

- Spec 02: Zutaten mit Menge und Einheit
- Lizenz BLS 4.0: CC BY 4.0, geprüft 07.11.2026 → ADR-004 in `guidelines.md` (Namensnennung Max Rubner-Institut Pflicht, Rohdaten nur in D1)

## Design (mit Marco, 07.11.2026)

- **Daten:** Tabelle `bls_foods` (Code, Name, kcal, Eiweiß, Fett, Kohlenhydrate, Zucker je 100 g). Importskript `scripts/import-bls.mjs` liest die entpackte XLSX und schreibt eine SQL-Datei (gitignored), die per `wrangler d1 execute` lokal und remote eingespielt wird.
- **Zuordnung je Zutatenname, für die ganze Familie:** Tabelle `ingredient_nutrition` über `ingredient_key` (wie Spec 06). Einmal „Haferflocken“ zugeordnet → gilt in allen Rezepten. Felder: `bls_code` (oder „nicht mitrechnen“ für Wasser, Salz nach Geschmack …) und Gramm je Einheit als JSON (`{"": 60, "el": 10, "ml": 0.92}`, Schlüssel klein aus `unitKey()`; `""` = Stück, `ml` gilt auch für cl/dl/l).
- **Vorschlag per Claude:** Knopf „Nährwerte berechnen“ auf der Rezeptseite. Die App sucht lokal je Zutat bis zu 20 BLS-Kandidaten (Wortteile, Plural). Claude bekommt nur die Zutatenzeilen und diese Kandidaten, wählt je Zutat einen Code (oder keinen bzw. „nicht mitrechnen“) und schätzt Gramm je Einheit. Codes außerhalb der Kandidaten werden verworfen. Effort `low`.
- **Bestätigen:** Fenster wie beim Ersatz: je Zutat Vorschlag, Gramm je Einheit änderbar, anderer BLS-Eintrag per Suchfeld, „nicht mitrechnen“. „Übernehmen“ speichert. Erst gespeicherte Zuordnungen zählen.
- **Rechnen:** immer frisch aus Zutaten + Zuordnungen (kein gespeichertes Ergebnis, das veralten kann). g/mg/kg fest, ml/cl/dl/l über Gramm je ml, sonst Gramm je Einheit. Spanne „2–3“ = Mittelwert. Pro Portion = Summe / Portionen des Rezepts.
- **Anzeige:** Karte „Nährwerte pro Portion“ (kcal groß, darunter Eiweiß, Fett, Kohlenhydrate, davon Zucker), Hinweis „unvollständig: n Zutaten fehlen“, Quelle „Max Rubner-Institut, BLS 4.0“.
- **Filter „Low Carb“:** nur vollständig berechnete Rezepte mit höchstens 20 g Kohlenhydraten pro Portion.

## Out of Scope

- Mikronährstoffe in der ersten Version (Spalten vorsehen, Anzeige später)
- Tagesbilanz, Kalorienzähler, Tracking pro Person
- Barcode-Scan

## Edge Cases

- Zutat nicht in BLS gefunden: Zuordnung per Auswahlliste nachholen, Nährwerte als „unvollständig“ markieren statt still falsch zu rechnen
- Einheiten ohne Gramm (Stück, EL, Prise): Umrechnungstabelle; nicht umrechenbare Mengen zählen als unvollständig
- Portionen-Stepper ändert die Gesamtmenge, Werte pro Portion bleiben gleich

## Akzeptanzkriterien

- [x] ADR zur BLS-Lizenz in `guidelines.md` (ADR-004)
- [x] BLS-Daten in D1 importiert (Skript, Quelle und Version dokumentiert)
- [x] Jede Zutat ist einem BLS-Eintrag zugeordnet (Vorschlag per Namenssuche, bestätigt durch Nutzer)
- [x] Rezeptseite: Nährwerte pro Portion, Hinweis bei unvollständiger Berechnung
- [x] Filter „Low Carb“: höchstens 20 g Kohlenhydrate pro Portion (mit Marco festgelegt am 07.11.2026)
- [x] Rechenlogik `src/lib/nutrition.ts` per TDD

## Tasks

- [x] Lizenz prüfen, ADR
- [x] Migration `0006_nutrition.sql` + Importskript, Daten lokal und remote
- [x] `src/lib/nutrition.ts` per TDD: Gramm je Zeile, Summe pro Portion, Kandidaten-Suchbegriffe
- [x] Store + Server Actions (vorschlagen, speichern, suchen), Claude-Aufruf
- [x] UI: Nährwert-Karte, Zuordnungs-Fenster, Low-Carb-Filter, Quellenangabe (auch README)

## Validation

- Schema, API, UI (`rules/verification.md`), Stichprobe: 3 erfundene Rezepte von Hand nachgerechnet

## Relevante Rules / Skills

- `superpowers:test-driven-development`, `rules/code-conventions.md`

## Debrief

- **Suche:** Der BLS schreibt anders als Rezepte („Hafer Flocken“, „Speisequark Magerstufe“, „Hühnerei“). Lokale Suche mit Wortteilen + Bonus für den Namensanfang bringt den richtigen Eintrag unter die ersten 20; Claude wählt daraus. Passt nichts, nennt Claude einen Suchbegriff und es gibt eine zweite Runde.
- **Stichprobe:** Testrezept lokal von Hand nachgerechnet (266 kcal, 42,3 g KH pro Portion), stimmt mit der Anzeige überein. Low-Carb-Filter in beide Richtungen geprüft.
- **Bewusst weggelassen:** Mikronährstoffe, kcal auf den Karten der Liste, gespeichertes Ergebnis (wird immer frisch gerechnet).

