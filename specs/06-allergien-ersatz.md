# 06 — Allergien und Ersatz-Zutaten

**Status:** ✅ Fertig (lokal getestet, 07.11.2026)

## Ziel

Als Person mit Allergien möchte ich auf jedem Rezept sofort sehen, welche Zutaten ich nicht vertrage, und passenden Ersatz bekommen, damit ich sicher mitessen kann.
Mit dem Knopf „Diese Zutaten besser nicht“ kann ich für ein Rezept gezielt Alternativen suchen lassen.

## Abhängigkeiten

- Spec 02: Zutaten als eigene Datensätze
- Spec 04: Claude-API-Anbindung (wird für Ersatzvorschläge wiederverwendet)

## Datenschutz (Pflicht)

Die konkreten Allergene stehen **nur in D1**, eingegeben über die App. Sie stehen nicht im Code, nicht in Specs und nicht in Tests oder Seeds. Tests nutzen erfundene Allergene wie „Testallergen A“.

## Entscheidungen (07.11.2026)

- Person = Login (`users`). Wer ein Allergie-Profil hat, braucht einen eigenen Cloudflare-Access-Login und gibt Ersatz selbst frei. Keine Profile ohne Login.
- `ingredients.is_raw`: Knopf je Zutatenzeile mit drei Zuständen „?“ → „roh“ → „gegart“ (ein Häkchen kennt kein „gegart“). Standard `NULL` = unbekannt → bei `nur_roh`-Allergenen gelb. Keine KI-Schätzung.
- Ersatz hängt an Rezept + `ingredient_key` (nicht an `ingredients.id`, die beim Speichern neu vergeben wird).
- Rezeptseite zeigt die Treffer der ganzen Familie mit Namen; zusätzliches Badge „prüfen“ für nur gelbe Treffer.

## Out of Scope

- Medizinische Beratung, Schweregrade, Notfallhinweise
- Allergen-Profile für Gäste
- Automatische Erkennung von Spuren in Fertigprodukten

## Edge Cases

- Allergen nur roh unverträglich, gekocht erlaubt: Je Allergen-Regel gibt es den Modus `immer` oder `nur_roh`. Jede Zutat im Rezept trägt `roh` ja/nein (Standard: aus dem Schritt nicht ableitbar → nachfragen, also gelb markieren statt grün).
- Versteckte Bestandteile (z. B. Mischprodukte, Öle, Aufstriche): Profil erlaubt Synonyme und Unterbegriffe je Allergen
- KI schlägt Ersatz vor, der selbst ein Allergen enthält: Vorschläge werden gegen das Profil geprüft, bevor sie erscheinen
- KI-Ersatz ist erst nach Freigabe durch die betroffene Person (nur sie, niemand sonst) sichtbar als „freigegeben“, vorher nur als „Vorschlag“

## Akzeptanzkriterien

- [x] Migration: `allergen_rules` (Name, Synonyme, Modus, Person), `ingredients.is_raw`, `substitutions` (Zutat → Ersatz, Status `vorschlag` | `freigegeben`, freigegeben_von)
- [x] Einstellungsseite: Allergen-Profil pflegen (nur angemeldete Familie)
- [x] Rezeptseite: betroffene Zutaten rot (sicher betroffen) oder gelb (prüfen), daneben freigegebener Ersatz
- [x] Rezeptliste: Badge „passt“ / „mit Ersatz“ / „prüfen“ / „nicht geeignet“ für die ganze Familie (Filter vorerst weggelassen, YAGNI)
- [x] Knopf „Diese Zutaten besser nicht“: Zutaten antippen → KI-Ersatzvorschläge → Freigabe durch die Person
- [x] Abgleich `src/lib/allergens.ts` per TDD (Synonyme, Modus `nur_roh`, Groß-/Kleinschreibung, Plural)

## Tasks

- [x] Freigabe-Recht: Nur die Person, zu der das Allergen-Profil gehört (entschieden 06.11.2026). Der Server prüft das, die UI blendet den Knopf für andere aus.
- [x] Datenmodell, Abgleich-Logik per TDD
- [x] Profil-UI, Markierung im Rezept, Ersatz-Dialog

## Validation

- Schema, API, UI (`rules/verification.md`); Repo-Check: `grep` auf echte Allergen-Namen in Code und Tests muss leer sein

## Relevante Rules / Skills

- `rules/code-conventions.md`, `superpowers:test-driven-development`, Skill `claude-api`

## Debrief

- Datenschutz: Claude bekommt beim Ersatz nur Rezept + angetippte Zutaten, nie das Profil. Bis zu 3 Vorschläge je Zutat, lokal mit `safeSuggestions` gegen das eigene Profil gefiltert (Ersatz gilt als „roh unbekannt“). Effort `low`.
- Vorschläge werden nicht gespeichert; Status `vorschlag` bleibt ungenutzt. Freigabe speichert direkt `freigegeben` für die angemeldete Person, der Server prüft Zutat und Profil erneut.
- Ersatz geht auch für Zutaten ohne Allergie-Treffer („mag ich nicht“) und erscheint dann grün in der Zutatenliste.
- Nachtrag nach iPhone-Test: Mehrzahl im Profil erkennt jetzt auch die Einzahl. Knopf „Andere Namen vorschlagen“ (Claude, Effort `low`): Nur der eine Begriff geht an Anthropic, und nur auf Knopfdruck. Vorschläge, die der Abgleich ohnehin erkennt, werden ausgefiltert.
- Bekannte Grenzen: Ersatz-Menge rechnet nicht mit dem Portionen-Regler mit; kein Filter nach Badge; Zutatenzeile im Formular auf dem iPhone schmal (4 Knöpfe).

