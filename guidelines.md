# Architektur-Entscheidungen (ADRs)

Format pro Eintrag: Kontext / Entscheidung / Warum / Alternativen.

---

## ADR-001 — Stack-Entscheidung

**Datum:** 30.10.2026

**Kontext:** Projekt-Setup, Auswahl Framework + Backend + Deployment.

**Entscheidung:** Next.js 16 (App Router) + React 19 + TypeScript strict, Tailwind v4 + shadcn/ui, Supabase (Auth + Postgres + RLS), Vercel (Hobby Tier), npm.

**Warum:**
- Next.js 16 App Router ist aktueller Standard für Full-Stack-React.
- Supabase liefert Auth + DB + RLS aus einer Hand, Free Tier reicht für Einsteiger-Projekte.
- Vercel = Zero-Config-Deployment für Next.js.
- shadcn = Komponenten als Copy-Code (kein Lib-Bloat).
- TypeScript strict verhindert ganze Bug-Kategorien.

**Alternativen:**
- T3-Stack (tRPC + Prisma) — verworfen, mehr Komplexität als nötig
- Remix — verworfen, kleinere Community
- SvelteKit — verworfen, weniger LLM-Trainingsdaten verfügbar
- Eigener Express-Backend — verworfen, mehr Wartungslast

---

## ADR-002 — Cloudflare statt Supabase und Vercel

**Datum:** 30.10.2026

**Kontext:** Das Supabase-Gratislimit (2 aktive Projekte) ist belegt, beide Projekte müssen aktiv bleiben. Das Cloudflare-Konto existiert bereits (KOIN).

**Entscheidung:** Next.js 16 über `@opennextjs/cloudflare` auf Cloudflare Workers, D1 als Datenbank, R2 für Fotos, Cloudflare Access als Login. Node 22 (`/opt/homebrew/opt/node@22/bin`, nicht global verlinkt).

**Warum:** Kostenlos im Familienumfang, kein Pausieren bei Nichtnutzung, kein eigenes Login-System. Lokal geprüft: Startseite läuft, 980 KB gzip bei 3 MB Limit.

**Wichtig:** `cacheComponents` und `partialPrefetching` bleiben aus. Mit ihnen hängt der Worker und liefert HTTP 500.

**Alternativen:** Supabase Pro (rund 25 $ im Monat), Supabase-Konto eines anderen Familienmitglieds, statisch plus Functions wie KOIN (Rückfallweg).

---

## ADR-003 — KI-Modell und Kosten für den Rezept-Import

**Datum:** 07.11.2026

**Kontext:** Spec 04 liest Rezepte aus Fotos, Screenshots und PDFs. Budget: Monatslimit 5 $ in der Anthropic-Console (Guthaben kommt aus dem Max-Plan), gemeinsam für Spec 04, 05 und 06.

**Entscheidung:** `claude-opus-5-5` mit `output_config.effort: "low"`, strukturierter Ausgabe (JSON-Schema, Prüfung mit zod) und `fallbacks: "default"` (Beta `server-side-fallback-2026-07-01`), damit eine Ablehnung automatisch auf ein Ersatzmodell geht. Aufruf über `@anthropic-ai/sdk` im Worker, Schlüssel nur als Worker-Secret `ANTHROPIC_API_KEY`. Bilder werden vor dem Upload im Browser auf ca. 1600 px lange Kante verkleinert (`resize-image.ts`), Limit 10 MB und 10 PDF-Seiten.

**Kosten (Schätzung):** Opus 5.5 kostet 4 $ pro 1 Mio. Eingabe-Token und 20 $ pro 1 Mio. Ausgabe-Token. Ein Import mit zwei Screenshots ≈ 5.500 Token rein und 2.000 raus ≈ 6–7 Cent, also rund 75 Imports im Monat. Gemessen am 07.11.2026 (2 Fotos, 1600 px): 6.979 Token rein, 499 raus, 7,9 Sekunden = **3,8 Cent**, also gut 130 Imports mit 5 $.

**Nachtrag Spec 05 (07.11.2026):** Die Umrechnung läuft mit Effort `medium` (Garzeiten und Temperaturen brauchen mehr Abwägung als Abschreiben), nur Text: gemessen 0,9–1,7 Cent pro Umrechnung. Gemeinsame Anbindung in `src/lib/claude.ts`.

**Alternativen:** Sonnet 5.5 (~3 Cent, ~150 Imports), Haiku 5.5 (~0,2 Cent, schwächer bei unscharfen Fotos und Handschrift). Wechsel ist eine Zeile (Modell-ID), falls das Budget knapp wird.

---

<!-- Weitere ADRs hier einfügen -->
