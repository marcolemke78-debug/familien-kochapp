# 08 — Einkaufsliste über Bring

**Status:** ✅ Fertig

## Ziel

Als Familienmitglied möchte ich die Zutaten eines Rezepts (in der gewählten Portionenzahl) mit einem Tipp in unsere Bring-Liste übernehmen, damit der Einkauf nicht vergessen wird.

## Abhängigkeiten

- Spec 02: Zutaten und Portionen
- Prüfung vor dem Bau: Bring-Import-Weg aus dem offiziellen Dev-Guide. Vermutlich liest Bring die Rezeptseite per Server. Hinter Cloudflare Access ist sie nicht erreichbar.

## Out of Scope

- Eigene Einkaufsliste in der App
- Inoffizielle Bring-API mit Passwort-Login (Zugangsdaten gehören nicht in die App)

## Edge Cases

- Bring kommt nicht an die Seite (Access): Variante prüfen, bei der nur eine kurzlebige, zufällige Export-URL ohne Login erreichbar ist. Sie enthält nur Zutatenliste und Titel, kein Foto und keine Allergien und läuft nach ca. 10 Minuten ab.
- Fallback, falls Bring gar nicht geht: Zutatenliste als Text teilen (Web Share API) oder kopieren
- Zutaten ohne Menge: werden ohne Menge übertragen

## Akzeptanzkriterien

- [x] Ergebnis der Bring-Prüfung als ADR in `guidelines.md` (ADR-005)
- [x] Knopf „Zu Bring“ auf der Rezeptseite, überträgt die aktuelle Portionenzahl
- [x] Funktioniert auf iPhone (Bring-App öffnet sich, getestet 08.11.2026)
- [x] … und am Mac (Web), getestet 08.11.2026
- [x] Fallback „Liste teilen“ vorhanden

## Tasks

- [x] Dev-Guide lesen, Testaufruf (Schnittstelle antwortet; localhost wird mit 403 abgelehnt)
- [x] Umsetzung gemäß ADR: `src/lib/bring.ts` (TDD), Migration `0007_bring_exports.sql`, Route `/bring/[token]`, `bring-actions.ts`, `bring-buttons.tsx`
- [x] Cloudflare Access: eigene Anwendung `…workers.dev/bring/` mit Policy „Bring-Export ohne Login“ (Bypass, Everyone), geprüft: nur `/bring/…` offen
- [x] Live-Test auf dem iPhone mit Marcos Bring-Liste
- [x] Live-Test am Mac

## Validation

- UI, API (`rules/verification.md`), echter Test mit Marcos Bring-Liste

## Relevante Rules / Skills

- `rules/code-conventions.md`

## Debrief

- **Weg:** Bring liest die Rezeptseite selbst, erst beim Import. Darum kurzlebige Export-Adresse `/bring/<token>` (10 min, nur Titel, Portionen, Zutaten mit freigegebenem Ersatz), in Cloudflare Access als eigene Anwendung mit Bypass nur für `/bring/`. Details: ADR-005.
- **Stolperstein:** Bring lehnt localhost-Adressen mit 403 ab, der eigentliche Import lässt sich nur live testen.
- **Dev-Server:** Nach `next typegen` hing der laufende Dev-Server in einer Fast-Refresh-Schleife (Seite lädt endlos neu). Neustart behebt es.
- **Bekannte Grenze:** Die Menge des Ersatzes rechnet nicht mit dem Portionen-Regler mit (wie Spec 06). Bring rechnet die ganze Liste selbst um.

