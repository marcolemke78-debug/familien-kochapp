# 04 — Rezept-Import per PDF, Foto oder Screenshot

**Status:** ✅ Fertig

## Ziel

Als Familienmitglied möchte ich ein PDF, ein Foto oder einen Screenshot eines Rezepts hochladen und einen fertig ausgefüllten Entwurf bekommen, damit ich Rezepte nicht abtippen muss.

## Abhängigkeiten

- Spec 02: Rezept-Formular und Datenmodell (der Import füllt dasselbe Formular)
- Claude-API-Schlüssel mit festem Budget-Limit von 5 € im Monat in der Anthropic-Console (Marco legt Schlüssel und Limit selbst an, Schlüssel als Worker-Secret, nie im Chat). Gilt auch für Spec 05 und 06.

## Out of Scope

- Import per URL oder automatisches Abrufen von Webseiten (ndr.de sperrt Crawler, Cookidoo nur verlinken)
- Stapel-Import mehrerer Rezepte auf einmal
- Automatisches Speichern ohne Kontrolle durch einen Menschen

## Edge Cases

- Kein Rezept erkennbar (Foto unscharf, falsches Dokument): klare Meldung, keine erfundenen Zutaten
- Mehrseitiges PDF oder sehr große Datei: Größenlimit vor dem API-Aufruf prüfen (z. B. 10 MB, 10 Seiten)
- API-Fehler, Budget erschöpft, Zeitüberschreitung: Meldung + Datei bleibt erhalten, erneut versuchen möglich
- Geräteangaben im Original (TM6-Stufen) werden mit Status `original` übernommen, nie als `getestet`
- Quelle (Buch, Sendung, Link) als Pflichtfeld im Entwurf, damit klar ist, woher das Rezept stammt
- Zutatengruppen wie „Für die Pasta:“ / „Für die Soße:“ (Marcos Beispiel vom 07.11.): **Entschieden 07.11.:** kommen als Zwischenüberschriften ins Datenmodell (eigene Zeile in der Zutatenliste, ohne Menge, wird nicht umgerechnet). Gilt auch beim manuellen Anlegen.
- Werbung und Affiliate-Links in der Vorlage (z. B. Amazon-Link mitten im Schritt) werden weggelassen, nicht übernommen
- Nährwertangaben in der Vorlage (kcal, Eiweiß …): erst mit Spec 07 speichern, bis dahin ignorieren
- Screenshot enthält ein Gericht-Foto: nicht automatisch als Rezeptfoto übernehmen (fremdes Bild); eigenes Foto später ergänzen
- Testmaterial (nicht ins Repo): Marcos Beispiel-Screenshots `~/Downloads/IMG_3963.JPG`, `IMG_3964.JPG`

## Akzeptanzkriterien

- [x] Vor dem Bau: Modell und Kosten pro Import mit Skill `claude-api` geprüft und in `guidelines.md` als ADR festgehalten
- [x] Upload-Seite: Datei wählen oder Foto aufnehmen (iPhone-Kamera), Fortschrittsanzeige
- [x] Server ruft Claude mit strukturierter Ausgabe (JSON-Schema) auf, Ergebnis wird mit zod validiert
- [x] Entwurf öffnet sich im normalen Rezept-Formular, erst „Speichern“ legt das Rezept an
- [x] Das Originalbild kann als Rezeptfoto übernommen werden (nur bei eigenem Foto, keine Buchseiten-Fotos als Rezeptbild)

## Tasks

- [x] ADR „KI-Modell und Kosten“ (ADR-003)
- [x] `src/lib/import.ts` (Prompt, Schema, Parser) per TDD mit erfundenen Beispieltexten
- [x] Upload-UI und Übergabe an das Formular

## Validation

- API, UI (`rules/verification.md`), echter Test mit einem selbst fotografierten Rezept (Foto nicht ins Repo)

## Relevante Rules / Skills

- Skill `claude-api`, `rules/code-conventions.md`, `superpowers:test-driven-development`

## Debrief

- 07.11.: Live. Test mit Marcos Screenshots (Scratchpad, nicht im Repo) Zeile für Zeile korrekt: Gruppen, Mengen, Affiliate-Satz und Nährwerte entfernt. Merkmale „schnell/günstig“ hat Claude geschätzt (steht nicht im Original), wird im Formular geprüft.
- 07.11.: iPhone-Test durch Marco erfolgreich (Foto aufnehmen → Entwurf → Speichern). Chrome-Erweiterung war nicht verbunden, darum lokal nur Screenshots + direkter API-Test.

