# 09 — Wochenplan

**Status:** ⏸ Zurückgestellt (entschieden 06.11.2026: erst bauen, wenn die Familie ihn wirklich vermisst)

## Ziel

Als Familienmitglied möchte ich Rezepte auf Wochentage und Mahlzeiten legen und die ganze Woche auf einmal zu Bring schicken, damit Planung und Einkauf zusammenpassen.

## Abhängigkeiten

- Spec 02 (Rezepte), Spec 08 (Bring)

## Out of Scope

- Automatische Wochenvorschläge per KI
- Mehrere parallele Pläne, Vorlagen-Wochen

## Edge Cases

- Gleiches Rezept zweimal in der Woche: Zutaten werden für Bring zusammengezählt
- Rezept gelöscht, aber eingeplant: Eintrag zeigt „Rezept entfernt“ statt Fehler
- Zwei Personen planen gleichzeitig: letzter Stand gewinnt, keine Dubletten pro Tag+Mahlzeit (UNIQUE)

## Akzeptanzkriterien

- [ ] Migration `meal_plan` (Datum, Mahlzeit, recipe_id, Portionen)
- [ ] Wochenansicht (Handy: Liste je Tag, iPad/Mac: Raster)
- [ ] Rezept einplanen aus der Rezeptseite
- [ ] „Woche zu Bring“ fasst Zutaten zusammen

## Tasks

- [ ] Vor dem Bau mit Marco klären, ob der Plan wirklich gebraucht wird
- [ ] Datenmodell, Ansicht, Zusammenfassung per TDD

## Validation

- Schema, UI (`rules/verification.md`), Mobile-Check

## Relevante Rules / Skills

- `rules/design-system.md`, `superpowers:test-driven-development`

## Debrief

