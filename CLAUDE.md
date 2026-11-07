# Projekt-Kontext — familien-kochapp

**Vision:** Private Familien-Kochapp für mehrere Personen auf Handy, iPad und Mac: eigene Rezeptsammlung mit Bild, klarer Kennzeichnung für Thermomix TM6 und Heißluftfritteuse, Ersatz bei Allergien, Nährwerten, Filtern nach Mahlzeit und Aufwand, Rezept-Import per PDF oder Screenshot und Einkaufsliste über Bring. Nicht zum Verkauf.

## Kommunikation
- Deutsch, RPL (respektvoll, pragmatisch, lösungsorientiert)
- Erkläre Schritte vor der Ausführung — Marco ist fortgeschrittener Anfänger

## Design
- **Ein-Satz-Kompass:** „Appetit zuerst: große Fotos, runde Formen, in zwei Tipps beim richtigen Rezept.“
- **Referenz (getdesign.md):** airbnb → `./DESIGN.md` (optional; „keine", wenn nicht gewählt)

## Tech-Stack
Next.js 16 + React 19 + TypeScript strict, Tailwind v4 + shadcn/ui auf Cloudflare (Workers über OpenNext, D1, R2, Access). Entscheidung und Fallen: `guidelines.md` ADR-002. Befehle mit Node 22: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`.

## Wann welche Rule lesen

| Aufgabe | Rule |
|---|---|
| Feature bauen oder ändern | ZUERST passende `specs/NN-*.md` (Out of Scope + Edge Cases beachten), Status in `implementierungsplan.md` |
| UI-Komponente bauen | `rules/design-system.md` + `DESIGN.md` (falls vorhanden) |
| Server Action / API Route | `rules/code-conventions.md` |
| Feature fertigstellen | `rules/verification.md` |
| Commands / MCPs / Struktur | `rules/tech-stack.md` |

## Next.js-Version
Siehe `AGENTS.md`: Vor dem Coden die Doku in `node_modules/next/dist/docs/` beachten.

## Tools / MCPs
- **Context7 MCP** — aktuelle Framework-Docs (Next.js 16, Cloudflare)

## Datenschutz
- Das Repo ist öffentlich: Rezepte, Fotos und Allergie-Angaben liegen nur in Cloudflare D1 und R2, nie im Code, in Specs oder Testdaten. Tests nur mit erfundenen Daten.

## Kernprinzipien
- Server Components by default, Client nur wo interaktiv
- Hover/Focus auf jedem interaktiven Element
- Mobile-first
- Bei API-Fragen: Context7 MCP konsultieren, NICHT aus Gedächtnis
