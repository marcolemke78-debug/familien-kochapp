# 02 — Rezepte mit Bild, Portionen und Geräten

**Status:** ✅ Fertig

## Ziel

Als Familienmitglied möchte ich Rezepte mit Foto, Zutaten, Schritten und Portionen anlegen, ansehen und bearbeiten, damit unsere besten Rezepte an einem Ort liegen.
Auf jedem Rezept sehe ich sofort, ob es im Thermomix TM6 und/oder in der Heißluftfritteuse geht und wie sicher diese Angabe ist.

## Abhängigkeiten

- Spec 01: Login, Layout, Theme
- R2-Bucket (Marco aktiviert R2, Bucket mit EU-Jurisdiktion). Ohne R2 lässt sich alles außer dem Foto-Upload bauen.

## Out of Scope

- Filter und Suche (Spec 03)
- Mehrere Fotos pro Rezept (vorerst ein Titelfoto, Erweiterung bei Bedarf)
- KI-Umrechnung für TM6/Heißluft (Spec 05)
- Import aus PDF oder Screenshot (Spec 04)
- Allergie-Warnungen und Ersatz (Spec 06), Nährwerte (Spec 07)
- Rechte pro Person: Alle aus der Familie dürfen alle Rezepte bearbeiten und löschen
- Kommentare, Bewertungen, Teilen nach außen

## Entscheidungen (07.11.2026)

- **Pflichtfelder:** Titel, mindestens eine Zutat und ein Schritt. Alles andere ist freiwillig, Portionen haben den Standardwert 4.
- **Rundung beim Portionen-Regler (Küchen-Rundung):** Löffel, Prisen, Tassen auf ¼ genau (z. B. „1½ EL“); Stück, Packungen und Mengen ohne Einheit auf ½ genau (1,67 Eier → 1½); g/ml unter 10 auf 1, unter 100 auf 5, ab 100 auf 10 genau; kg/l auf 0,05 genau. Nie auf 0 runden. Bei der Original-Portionenzahl bleibt jede Menge exakt. Mengen ohne Zahl bleiben unverändert.
- **Fotoformate:** Der Browser wandelt jedes Foto (auch HEIC vom iPhone) in ein JPEG mit 1600 px um. Der Server nimmt nur JPEG, PNG und WebP bis 5 MB an und prüft das Format an den ersten Bytes.
- **Zutaten-Eingabe:** eine Zeile pro Zutat (z. B. „200 g Mehl“). Die App zerlegt die Zeile automatisch in Menge, Einheit und Name.

## Edge Cases

- Foto zu groß oder falsches Format: Annahme nur von JPEG, PNG, WebP und HEIC bis 10 MB, sonst eine klare Fehlermeldung. Handyfotos werden im Browser verkleinert (lange Kante 1600 px), bevor sie hochgeladen werden.
- Rezept ohne Foto: ein warmer Platzhalter, kein kaputtes Bild
- Portionen umrechnen: Mengen ohne Zahl („1 Prise“, „nach Geschmack“) bleiben unverändert. Brüche wie 0,33 werden sinnvoll gerundet.
- Doppelklick auf „Speichern“ erzeugt kein zweites Rezept (Button sperren, Server Action idempotent)
- Löschen nur nach Bestätigung (ohne `confirm()`-Dialog, eigener Dialog). Das Foto in R2 wird mitgelöscht.
- Cookidoo-Rezepte: nur Link als Quelle speichern, keinen Text kopieren

## Akzeptanzkriterien

- [x] Migration `0002_recipes.sql`: `recipes` (Titel, Beschreibung, Portionen, Zubereitungszeit, Quelle/Link, Foto-Key, erstellt_von, Zeitstempel), `ingredients` (Menge, Einheit, Name, Reihenfolge), `steps` (Text, Reihenfolge), `recipe_devices` (Gerät `tm6` | `airfryer`, Status `original` | `ki` | `getestet`, optional Geräte-Hinweis wie Stufe/Temperatur)
- [x] Kategorien je Rezept: Mahlzeit (Frühstück, Hauptmahlzeit, Abend, Zwischendurch, Kuchen und Backen; mehrere möglich) und Merkmale (schnell, günstig, vorbereiten)
- [x] Rezept anlegen und bearbeiten in einem Formular, das auf dem Handy gut bedienbar ist (Zutaten- und Schrittzeilen hinzufügen und sortieren)
- [x] Rezeptliste als Karten mit großem Foto (Kompass: Appetit zuerst) und Geräte-Symbolen
- [x] Rezeptseite: Foto, Geräte-Badges mit Status (z. B. „TM6 · getestet“), Portionen-Stepper rechnet Zutaten live um, Schritte gut lesbar mit nassen Fingern (große Schrift, Mindestgröße 44 px für Tipp-Ziele)
- [x] Knopf „Haben wir getestet“ je Gerät setzt den Status auf `getestet`
- [x] Foto-Upload nach R2, Auslieferung über eine Route nur für angemeldete Nutzer
- [x] Server Actions validieren alle Eingaben (zod) und prüfen den Login

## Tasks

- [x] Context7: R2-Binding in OpenNext, Upload aus Server Action
- [x] Migration schreiben und anwenden
- [x] Datenzugriff `src/lib/recipes.ts` + Portionen-Umrechnung `src/lib/scale.ts` per TDD
- [x] Formular, Liste und Detailseite
- [x] Foto-Upload und Foto-Route
- [x] Testdaten nur erfunden (z. B. „Testrezept Gemüsepfanne“), nie echte Familienrezepte im Repo

## Validation

- Schema, UI, API (`rules/verification.md`)
- Mobile-Check 375/768/1280 px, iPad-Safari, Foto vom iPhone hochladen

## Relevante Rules / Skills

- `rules/design-system.md`, `./DESIGN.md`, `rules/code-conventions.md`
- `superpowers:test-driven-development` (scale.ts, Server Actions)

## Debrief

