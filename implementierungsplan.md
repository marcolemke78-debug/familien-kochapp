# Implementierungsplan

Arbeitspaket-Tabelle. Wird in Phase 3 befüllt (eine Zeile pro Feature-Spec).

## Status-Legende

- ⏳ Geplant
- 🚧 In Arbeit
- ⏸ Zurückgestellt (erst bei echtem Bedarf)
- ✅ Fertig (Akzeptanzkriterien abgehakt, Debrief geschrieben)

## Arbeitspakete

| # | Feature | Spec | Abhängigkeiten | Status |
|---|---|---|---|---|
| 01 | Grundgerüst, Design (Airbnb), Login über Cloudflare Access | `specs/01-grundgeruest-login.md` | D1 ✅, Zero Trust ✅ | ✅ |
| 02 | Rezepte mit Bild, Portionen, Geräte-Status | `specs/02-rezepte.md` | 01, R2 ✅ | ✅ |
| 03 | Filter und Suche | `specs/03-filter-suche.md` | 02 | ✅ |
| 04 | Import per PDF/Foto/Screenshot (Claude) | `specs/04-import.md` | 02, API-Key | ✅ |
| 05 | Rezept für TM6/Heißluft umrechnen (Claude) | `specs/05-geraete-umrechnen.md` | 02, 04 | ✅ |
| 06 | Allergien und Ersatz-Zutaten | `specs/06-allergien-ersatz.md` | 02, 04 | ✅ |
| 07 | Nährwerte pro Portion (BLS 4.0) | `specs/07-naehrwerte.md` | 02, Lizenz | 🚧 |
| 08 | Einkaufsliste über Bring | `specs/08-bring.md` | 02 | ⏳ |
| 09 | Wochenplan | `specs/09-wochenplan.md` | 02, 08 | ⏸ zurückgestellt |
