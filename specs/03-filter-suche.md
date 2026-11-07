# 03 — Filter und Suche

**Status:** ✅ Fertig

## Ziel

Als Familienmitglied möchte ich mit zwei Tipps das passende Rezept finden (z. B. „Abend + schnell + Heißluft“), damit die Entscheidung „Was kochen wir heute?“ schnell geht.

## Abhängigkeiten

- Spec 02: Rezepte mit Kategorien und Geräten

## Out of Scope

- Filter nach Allergenen (Spec 06) und Nährwerten (Spec 07)
- Volltextsuche in Schritten, unscharfe Suche, Sortierung nach Beliebtheit

## Edge Cases

- Keine Treffer: freundlicher Leerzustand mit Knopf „Filter zurücksetzen“
- Filter stehen in der URL (`?mahlzeit=abend&geraet=airfryer`), damit Zurück-Taste und Lesezeichen funktionieren. Unbekannte Werte werden ignoriert, nicht mit Fehler beantwortet.
- Suche mit Sonderzeichen oder SQL-Fragmenten: nur gebundene Parameter, kein String-Zusammenbau

## Akzeptanzkriterien

- [x] Filter-Chips oben in der Rezeptliste: Mahlzeit (inkl. Kuchen und Backen), Merkmale (schnell, günstig, vorbereiten), Gerät (TM6, Heißluft)
- [x] Mehrere Chips kombinierbar (UND über Gruppen, ODER innerhalb einer Gruppe)
- [x] Suchfeld nach Titel und Zutat
- [x] Filterung serverseitig in D1, Seite bleibt Server Component
- [x] Chips touch-freundlich (min. 44 px), horizontal scrollbar auf dem Handy

## Tasks

- [x] Abfrage-Builder `src/lib/recipe-query.ts` per TDD
- [x] Filter-Chips (Client-Komponente, schreibt URL), Liste liest `searchParams`
- [x] Leerzustand

## Validation

- UI, API (`rules/verification.md`), Mobile-Check 375/768/1280 px

## Relevante Rules / Skills

- `rules/design-system.md`, `superpowers:test-driven-development`

## Debrief

