# 07 — Nährwerte pro Portion

**Status:** ⏳ Geplant

## Ziel

Als Familienmitglied möchte ich pro Portion Kalorien, Eiweiß, Fett und Kohlenhydrate sehen, damit wir Low-Carb-Rezepte und zuckerarme Kuchen gezielt auswählen können.

## Abhängigkeiten

- Spec 02: Zutaten mit Menge und Einheit
- Lizenz BLS 4.0: CC BY 4.0, geprüft 07.11.2026 → ADR-004 in `guidelines.md` (Namensnennung Max Rubner-Institut Pflicht, Rohdaten nur in D1)

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
- [ ] BLS-Daten in D1 importiert (Skript, Quelle und Version dokumentiert)
- [ ] Jede Zutat ist einem BLS-Eintrag zugeordnet (Vorschlag per Namenssuche, bestätigt durch Nutzer)
- [ ] Rezeptseite: Nährwerte pro Portion, Hinweis bei unvollständiger Berechnung
- [ ] Filter „Low Carb“ (Grenzwert pro Portion, in Spec vor dem Bau mit Marco festlegen)
- [ ] Rechenlogik `src/lib/nutrition.ts` per TDD

## Tasks

- [x] Lizenz prüfen, ADR
- [ ] Importskript, Zuordnungs-UI, Berechnung, Anzeige

## Validation

- Schema, API, UI (`rules/verification.md`), Stichprobe: 3 erfundene Rezepte von Hand nachgerechnet

## Relevante Rules / Skills

- `superpowers:test-driven-development`, `rules/code-conventions.md`

## Debrief

