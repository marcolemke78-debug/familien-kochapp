# 05 — Rezept für TM6 oder Heißluft umrechnen

**Status:** ⏳ Geplant

## Ziel

Als Familienmitglied möchte ich ein normales Rezept per Knopfdruck in eine Thermomix-TM6- oder Heißluftfritteusen-Version umrechnen lassen, damit wir mehr Rezepte mit unseren Geräten kochen können.
Die KI-Version ist klar als „von KI umgerechnet“ gekennzeichnet, bis wir sie gekocht und als „getestet“ abgehakt haben.

## Abhängigkeiten

- Spec 02: Rezepte, Geräte-Status, Knopf „Haben wir getestet“
- Spec 04: Claude-API-Anbindung und Budget-Limit (5 € im Monat)

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

- [ ] Datenmodell: Geräte-Variante je Rezept und Gerät (eigene Schritte, Geräte-Einstellungen je Schritt, Status `ki` → `getestet`)
- [ ] Rezeptseite: Knopf „Für TM6 umrechnen“ / „Für Heißluft umrechnen“, wenn es noch keine Variante gibt
- [ ] Umschalter auf der Rezeptseite: Original / TM6 / Heißluft
- [ ] Ergebnis ist vor dem Speichern als Vorschau sichtbar und bearbeitbar
- [ ] Badge „von KI umgerechnet“ gut sichtbar, nach „Haben wir getestet“ dann „getestet“
- [ ] Prompt, Schema und Grenzwert-Prüfung in `src/lib/convert.ts` per TDD (mit erfundenen Rezepten)

## Tasks

- [ ] Context7 und Skill `claude-api`: gleiche Anbindung wie Spec 04 wiederverwenden
- [ ] Datenmodell, Umrechnungs-Logik, Vorschau, Umschalter

## Validation

- Schema, API, UI (`rules/verification.md`); echter Test: ein Rezept umrechnen, nachkochen, als getestet markieren

## Relevante Rules / Skills

- Skill `claude-api`, `rules/code-conventions.md`, `superpowers:test-driven-development`

## Debrief

