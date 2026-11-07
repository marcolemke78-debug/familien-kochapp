# familien-kochapp

Private Familien-Kochapp für mehrere Personen auf Handy, iPad und Mac: eigene Rezeptsammlung mit Bild, klarer Kennzeichnung für Thermomix TM6 und Heißluftfritteuse, Ersatz bei Allergien, Nährwerten, Filtern nach Mahlzeit und Aufwand, Rezept-Import per PDF oder Screenshot und Einkaufsliste über Bring. Nicht zum Verkauf.

## Local Development

```bash
npm install
npm run dev
```

Lokale Env-Vars in `.env.local` (siehe `.env.example`).

## Docs

- **Kontext für Claude:** `CLAUDE.md`
- **Architektur-Entscheidungen:** `guidelines.md`
- **Feature-Specs:** `specs/`
- **Design-Regeln:** `rules/design-system.md`
- **Code-Konventionen:** `rules/code-conventions.md`
- **Verification:** `rules/verification.md`
- **Tech-Stack:** `rules/tech-stack.md`

## Roadmap

Siehe `implementierungsplan.md`.

## Backlog

Siehe `backlog.md`.

## Datenquellen

Nährwerte: Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0, Karlsruhe, DOI [10.25826/Data20251217-134202-0](https://doi.org/10.25826/Data20251217-134202-0), Lizenz [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.de). Die Rohdaten liegen nicht im Repo, Import siehe `scripts/import-bls.mjs`.
