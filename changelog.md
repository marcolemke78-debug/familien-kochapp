# Changelog

Chronologisches Protokoll der Änderungen am Projekt. Wird nach jedem Feature (Phase 4) ergänzt.

Format pro Eintrag:
```
## YYYY-MM-DD — <Feature/Änderung>

- Was wurde gemacht
- Warum
- Was hat das beeinflusst
```

---

## 2026-11-06 — Spec 01: Grundgerüst, Design, Login

- shadcn/ui (base-nova), Airbnb-Theme aus `./DESIGN.md` mit Dark Mode nach Systemeinstellung, Schrift Plus Jakarta Sans, Knöpfe mindestens 44 px.
- Primärfarbe `#e00b41` statt `#ff385c`, weil `#ff385c` mit weißer Schrift nur 3,4:1 Kontrast erreicht (`#e00b41`: 4,7:1).
- D1-Tabelle `users`, Login über Cloudflare Access (Worker-Access, Policy „Familie“ mit E-Mail-Code). `src/lib/access.ts` prüft das JWT selbst (jose, 10 Tests).
- R2-Bucket `familien-kochapp-fotos` (EU) angelegt, für Spec 02.
- Live: https://familien-kochapp.marcolemke78.workers.dev, getestet auf Mac (Chrome) und iPad (Safari).

## 2026-11-07 — Spec 02: Rezepte mit Bild, Portionen, Geräte-Status

- D1-Migration `0002_recipes.sql`: `recipes`, `ingredients`, `steps`, `recipe_tags`, `recipe_devices` (CASCADE beim Löschen).
- Liste als Fotokarten, Rezeptseite mit Portionen-Stepper (Küchen-Rundung), Geräte-Badges und „Haben wir getestet“, Formular für Neu/Bearbeiten (Zeilen hinzufügen, verschieben, mehrzeilig einfügen), Löschen mit eigenem Dialog.
- Fotos: Browser verkleinert auf 1600 px JPEG (auch HEIC), Server prüft Magic Bytes, R2-Ablage, Auslieferung nur mit Login über `/fotos/[key]`.
- Zutatenzeile wird automatisch zerlegt („1 ½ EL“, „2–3 Zehen“, „1.500 g“). Alle Kind-Daten gehen per `json_each` in je eine Abfrage (D1-Grenzen: 50 Abfragen, 100 Parameter).
- Doppelklick-Schutz über `client_id` (UNIQUE). Eingabefelder 16 px, damit iOS nicht zoomt.
- Review durch zweiten Agenten: 2 Parser-Fehler und 4 Hinweise behoben. 41 Tests.

## 2026-11-07 — Spec 03: Filter und Suche

- Filterleiste über der Rezeptliste: Chips für Mahlzeit, Merkmale und Gerät, Suchfeld für Titel und Zutaten.
- Alles steht in der URL (`?mahlzeit=abend,backen&merkmal=schnell&geraet=tm6&q=nudel`), Chips sind Links, Suche über `next/form`. Kein eigenes Client-JavaScript.
- UND zwischen Gruppen, ODER innerhalb einer Gruppe, gefiltert in D1 (`src/lib/recipe-query.ts`, 11 Tests). Unbekannte Werte werden ignoriert.
- Leerzustand „Nichts gefunden“ mit „Filter zurücksetzen“. Auf dem Handy steht „✕ n Filter löschen“ vorn in der wischbaren Leiste.

## 2026-11-07 — Spec 04: Import per Foto, Screenshot oder PDF (live, auf dem iPhone getestet)

- ADR-003: `claude-opus-5-5`, Effort `low`, strukturierte Ausgabe (zod), `fallbacks: "default"`. Erster echter Test mit 2 Fotos: 7,9 s, 6.979 + 499 Token = 3,8 Cent.
- Migration `0003_import.sql`: `ingredients.is_heading` (Zutatengruppen wie „Für die Soße:“) und `recipes.source_note` (freie Quelle neben dem Link). Im Formular wird eine Zeile mit Doppelpunkt am Ende und ohne Menge zur Überschrift.
- `src/lib/import.ts` (Dateiprüfung per Magic Bytes, max. 4 Fotos oder 1 PDF mit 10 Seiten / 10 MB, Prompt, Schema, `toDraft` entfernt Links und hält Formulargrenzen ein), `src/lib/import-claude.ts` (Aufruf, Fehlermeldungen pro Fehlerart).
- Seite `/rezepte/import` (Datei wählen / Foto aufnehmen, Fortschritt mit Sekunden, Entwurf im normalen Formular, Quelle dann Pflicht, eigenes Foto optional als Rezeptfoto). Einstieg als Karte auf „Neues Rezept“.
- Server-Action-Limit 6 → 11 MB (PDFs). Worker-Paket 1.390 KB gzip (vorher 980 KB, SDK).
