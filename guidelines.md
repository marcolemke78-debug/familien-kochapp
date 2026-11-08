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

## ADR-004 — Nährwertdaten aus dem BLS 4.0

**Datum:** 07.11.2026 (Vorschlag, Speicherort mit Marco bestätigen)

**Kontext:** Spec 07 braucht Nährwerte je Lebensmittel. Der Bundeslebensmittelschlüssel (BLS) war früher kostenpflichtig, Version 4.0 ist seit Dezember 2025 offen.

**Lizenz (geprüft auf blsdb.de/download):** CC BY 4.0. Nutzung, Weitergabe und Bearbeitung erlaubt, auch in einem öffentlichen Repo. Pflicht: Max Rubner-Institut als Herausgeber nennen. Zitat: Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0, Karlsruhe, DOI 10.25826/Data20251217-134202-0.

**Entscheidung (Vorschlag):** Die Rohdaten (ZIP `BLS_4_0_2025_DE.zip`) kommen nicht ins Repo, damit es klein bleibt. Ein Importskript lädt die Datei, liest nur die benötigten Spalten und schreibt sie in eine D1-Tabelle. Quelle und Version stehen im Skript. Die Namensnennung erscheint in der App (Fußzeile der Nährwert-Anzeige) und in der README.

**Alternativen:** Datei ins Repo (erlaubt, aber unnötig groß); Open Food Facts (Produktdaten statt Grundlebensmittel, ODbL mit Share-Alike).

---

## ADR-005 — Einkaufsliste über Bring per kurzlebiger Export-Adresse

**Datum:** 08.11.2026

**Kontext:** Spec 08. Bring bietet für Rezepte einen Import über `api.getbring.com/rest/bringrecipes/deeplink?url=…&source=web&baseQuantity=…&requestedQuantity=…` (Bring Import Dev Guide, Web-to-App). Die Schnittstelle antwortet sofort mit einer Weiterleitung auf einen App-Link (`getbring.onelink.me/…`). Die Rezeptseite liest Bring erst beim Import, sie muss dann ohne Login erreichbar sein (schema.org `Recipe`). Hinter Cloudflare Access geht das nicht. localhost-Adressen lehnt Bring mit 403 ab, darum lässt sich der Weg nur live testen.

**Entscheidung:** „Zu Bring“ legt in D1 (`bring_exports`) ein Zufalls-Token an, gültig 10 Minuten. Die Route `/bring/<token>` liefert nur Titel, Portionen und Zutaten (JSON-LD und schlichtes HTML), kein Foto, keine Allergien, `noindex`, `no-store`. Freigegebener Ersatz ist eingerechnet (ein Topf für alle, wie bei den Nährwerten). Bring rechnet die Portionen selbst um. In Cloudflare Access hat nur der Pfad `/bring/` eine eigene Anwendung mit Regel „Bypass“. Ohne Login gibt es nur die Bring-Route. Abgelaufene Tokens räumt der nächste Export weg. Fallback „Liste teilen“ (Web Share API, sonst Zwischenablage).

**Alternativen:** Inoffizielle Bring-API mit Passwort-Login (Zugangsdaten gehören nicht in die App, Out of Scope); Export-Datei im öffentlichen R2-Bucket (mehr Aufwand fürs Aufräumen, kein Vorteil); signierte URL ohne Tabelle (bräuchte ein weiteres Secret).

**Datenschutz:** Bring bekommt Titel und Zutatenliste der exportierten Rezepte. Die Token sind 128 Bit zufällig und nach 10 Minuten wertlos.

---

<!-- Weitere ADRs hier einfügen -->
