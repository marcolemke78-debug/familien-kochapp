# 10 — TM6 und Heißluft zusammen

**Status:** 🚧 In Arbeit

## Ziel

Als Familienmitglied möchte ich ein Rezept per Knopfdruck so planen lassen, dass Thermomix TM6 und Heißluftfritteuse zusammen arbeiten, damit das Essen schneller fertig, knuspriger oder in größerer Menge möglich ist.
Egal, ob das Rezept aus Cookidoo, einem Foto-Import oder von Hand stammt. Die KI-Version ist als „von KI geplant“ gekennzeichnet, bis wir sie gekocht und als „getestet“ abgehakt haben.

## Abhängigkeiten

- Spec 05: Geräte-Einstellungen, Grenzwerte (`checkStep`), Vorschau-Felder, Claude-Anbindung
- Spec 04: Budget-Limit (5 $ im Monat)

## Out of Scope

- Zeitstrahl, Timer, Erinnerungen
- Automatische Vorschläge ohne Knopfdruck
- Kombi-Filter oder Kombi-Badge in der Rezeptliste
- Geänderte Zutaten oder Mengen (größere Mengen gehen über den Portionen-Regler; die KI nennt es nur im Nutzen-Satz)

## Edge Cases

- Kombi bringt nichts (z. B. reines Kuchenrezept): Die KI antwortet „nicht sinnvoll“ mit Grund, es wird nichts gespeichert.
- KI nutzt nur ein Gerät: gilt als „nicht sinnvoll“ (dafür gibt es Spec 05).
- Erster Schritt „gleichzeitig“: wird ignoriert, es gibt nichts davor.
- Schritt mit Gerät, aber Einstellungen des anderen Geräts: Speichern gesperrt.
- Zweite Planung: ersetzt eine ungetestete Kombi. Eine getestete nur nach ausdrücklicher Bestätigung.
- Rezept wird später bearbeitet: Hinweis „Original wurde geändert, bitte prüfen oder neu planen“.
- Rezept wird gelöscht: Kombi verschwindet mit (ON DELETE CASCADE).

## Akzeptanzkriterien

- [x] Datenmodell: eigene Tabellen `combo_plans` (Nutzen-Satz, Status `ki` → `getestet`, Zeitpunkt) und `combo_steps` (Text, Gerät oder ohne, Einstellungen, „gleichzeitig mit dem vorigen“). Nur hinzufügende Migration, `recipe_devices` bleibt unverändert.
- [x] Rezeptseite: Knopf „Mit beiden Geräten kochen“, bei vorhandener Kombi „Beide neu planen“
- [x] Vorschau vor dem Speichern: Nutzen-Satz und Schritte bearbeitbar, Gerät je Schritt wählbar, Haken „gleichzeitig“
- [x] Umschalter: Original / TM6 / Heißluft / Beide
- [x] Ansicht „Beide“: Nutzen-Satz, Status-Badge, Gerät und Einstellungen je Schritt, „gleichzeitig“-Markierung, Knopf „Als getestet markieren“
- [x] Prompt, Schema, Prüfung in `src/lib/combo.ts` per TDD (erfundene Rezepte)

## Validation

- Schema, API, UI (`rules/verification.md`); echter Test: ein Rezept planen, nachkochen, als getestet markieren

## Relevante Rules / Skills

- Skill `claude-api`, `rules/code-conventions.md`, `superpowers:test-driven-development`

## Entscheidungen (08.11.2026)

- Claude wählt den größten Gewinn selbst (Zeit, Knusprigkeit oder Menge) und nennt ihn in einem Satz.
- Eigene Tabellen statt `recipe_devices` erweitern: Die CHECK-Regel dort ließe sich in SQLite nur durch Neuaufbau der Tabelle mit Live-Daten ändern.
- Claude-Schema mit getrennten Feldern `tm6` / `airfryer` je Schritt, gespeichert als `settings` passend zum Gerät.

## Debrief

- 08.11.: Lokal mit erfundenem Rezept (Knolli-Ecken + Blubbersoße) getestet: Claude plant Heißluft (Air Fry, MegaZone, 200 °C, 25 Min.) und startet den TM6 so, dass beides gleichzeitig fertig ist. Vorschau → Speichern → Ansicht „Beide“ → „Als getestet markieren“ geklappt, Löschen des Rezepts entfernt die Kombi mit. Screenshots 390 und 1280 px geprüft.
- „Gleichzeitig mit Schritt N“ war missverständlich (TM6-Schritt 5 läuft parallel zur Heißluft aus Schritt 3, nicht zu Schritt 4) → Anzeige heißt jetzt „Währenddessen“.
- Offen: echter Kochtest durch Marco auf dem iPhone.
