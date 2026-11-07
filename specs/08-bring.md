# 08 — Einkaufsliste über Bring

**Status:** ⏳ Geplant

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

- [ ] Ergebnis der Bring-Prüfung als ADR in `guidelines.md`
- [ ] Knopf „Zu Bring“ auf der Rezeptseite, überträgt die aktuelle Portionenzahl
- [ ] Funktioniert auf iPhone (Bring-App öffnet sich) und am Mac (Web)
- [ ] Fallback „Liste teilen“ vorhanden

## Tasks

- [ ] Dev-Guide lesen, Testaufruf mit erfundenem Rezept
- [ ] Umsetzung gemäß ADR

## Validation

- UI, API (`rules/verification.md`), echter Test mit Marcos Bring-Liste

## Relevante Rules / Skills

- `rules/code-conventions.md`

## Debrief

