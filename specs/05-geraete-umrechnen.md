# 05 — Rezept für TM6 oder Heißluft umrechnen

**Status:** ✅ Fertig

## Ziel

Als Familienmitglied möchte ich ein normales Rezept per Knopfdruck in eine Thermomix-TM6- oder Heißluftfritteusen-Version umrechnen lassen, damit wir mehr Rezepte mit unseren Geräten kochen können.
Die KI-Version ist klar als „von KI umgerechnet“ gekennzeichnet, bis wir sie gekocht und als „getestet“ abgehakt haben.

## Abhängigkeiten

- Spec 02: Rezepte, Geräte-Status, Knopf „Haben wir getestet“
- Spec 04: Claude-API-Anbindung und Budget-Limit (5 $ im Monat)

## Out of Scope

- Umrechnung für andere Geräte (Backofen, Dampfgarer, andere Thermomix-Modelle)
- Automatisches Umrechnen ohne Knopfdruck
- Cookidoo-Rezepte als Vorlage für die KI (nur verlinken, nicht kopieren)

## Edge Cases

- Rezept passt nicht zum Gerät (z. B. Suppe in der Heißluftfritteuse): Die KI darf „nicht sinnvoll“ antworten. Die App zeigt das, statt eine Fantasie-Version zu speichern.
- Original bleibt immer erhalten: Die Geräte-Version wird als eigene Variante gespeichert und überschreibt nie die Originalschritte.
- Zweite Umrechnung für dasselbe Gerät: ersetzt nur eine noch ungetestete KI-Version. Eine getestete Version bleibt bestehen, es sei denn, man bestätigt ausdrücklich.
- Sicherheit: TM6-Temperaturen und -Stufen sowie Heißluft-Temperaturen und -Zeiten müssen in realistischen Grenzen liegen (Prüfung mit zod). Ausreißer zeigen eine Warnung.
- Rezept wird später bearbeitet: Die Geräte-Version bekommt den Hinweis „Original wurde geändert, Umrechnung prüfen“.

## Akzeptanzkriterien

- [x] Datenmodell: Geräte-Variante je Rezept und Gerät (eigene Schritte, Geräte-Einstellungen je Schritt, Status `ki` → `getestet`)
- [x] Rezeptseite: Knopf „Für TM6 umrechnen“ / „Für Heißluft umrechnen“, wenn es noch keine Variante gibt
- [x] Umschalter auf der Rezeptseite: Original / TM6 / Heißluft
- [x] Ergebnis ist vor dem Speichern als Vorschau sichtbar und bearbeitbar
- [x] Badge „von KI umgerechnet“ gut sichtbar, nach „Haben wir getestet“ dann „getestet“
- [x] Prompt, Schema und Grenzwert-Prüfung in `src/lib/convert.ts` per TDD (mit erfundenen Rezepten)

## Tasks

- [x] Context7 und Skill `claude-api`: gleiche Anbindung wie Spec 04 wiederverwenden
- [x] Datenmodell, Umrechnungs-Logik, Vorschau, Umschalter

## Validation

- Schema, API, UI (`rules/verification.md`); echter Test: ein Rezept umrechnen, nachkochen, als getestet markieren

## Relevante Rules / Skills

- Skill `claude-api`, `rules/code-conventions.md`, `superpowers:test-driven-development`

## Entscheidungen (07.11.2026)

- Heißluft = unser Gerät: Ninja Foodi FlexDrawer AF500EU (10,4 l, Zone 1/2 je 5,2 l oder MegaZone, 40–240 °C), Konstante `AIRFRYER_MODEL` in `src/lib/convert.ts`. Temperatur und Zeit stehen in jedem Schritt, damit es auch mit anderen Geräten nutzbar bleibt.
- Variante = eigene Schritte, gleiche Zutaten. Einstellungen je Schritt als JSON (`device_steps.settings`), geprüft mit `checkStep` (Fehler sperren Speichern, Warnungen nicht).
- Geräteangabe aus dem Original (`converted_at` NULL) wird nie durch eine KI-Variante ersetzt.
- Vorschau: Text plus Auswahlfelder (TM6-Temperatur und -Stufe als Liste, Zeit als „Min:Sek“).

## Debrief

- 07.11.: Echte Tests mit erfundenen Rezepten: Kartoffelecken → Air Fry MegaZone 200 °C 25 Min. (1,6 Cent), Tomatensoße → TM6 5 Sek./St. 5, 3 Min./120 °C, 20 Min./100 °C Linkslauf (1,7 Cent), Suppe → Heißluft „nicht sinnvoll“ (0,9 Cent). Ansichten per Screenshot geprüft (375/1280 px). Vorschau-Editor lokal nicht geklickt (Chrome-Erweiterung nicht verbunden); iPhone-Test durch Marco am 07.11. erfolgreich.

