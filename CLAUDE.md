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

## Live-Daten schützen
Es gibt nur **eine** D1-Datenbank, und die enthält echte Familiendaten (Rezepte, Allergien). Lokal läuft `wrangler dev` gegen eine lokale Kopie, alles mit `--remote` trifft die echten Daten.
- Kein `DROP`, `DELETE` ohne `WHERE`, `TRUNCATE` und keine Migration, die Spalten oder Tabellen entfernt, ohne Marcos ausdrückliches OK im selben Schritt.
- Keine `wrangler d1 execute … --remote`-Befehle, die schreiben, außer Marco gibt sie frei. Lesende Abfragen sind ok.
- Eine Sperre oder ein Guard, der nicht sicher erkennt, ob er lokal oder remote läuft, **bricht ab**. Getestet wird nur lokal, **nie an der Live-DB**.
- Vor jeder Migration wird gesichert: `npm run deploy` ruft `scripts/backup-db.sh` automatisch auf, einzeln geht es mit `npm run backup`. Die Sicherungen liegen in `backups/` (gitignored, nie committen, Inhalt nicht in den Chat lesen).
- Wiederherstellen nur mit Marcos OK: `npx wrangler d1 execute familien-kochapp --remote --file backups/<datei>.sql` (vorher die betroffenen Tabellen leeren, sonst gibt es doppelte Einträge).

## Kernprinzipien
- Server Components by default, Client nur wo interaktiv
- Hover/Focus auf jedem interaktiven Element
- Mobile-first
- Bei API-Fragen: Context7 MCP konsultieren, NICHT aus Gedächtnis
