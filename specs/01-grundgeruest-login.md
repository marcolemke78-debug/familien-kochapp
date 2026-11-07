# 01 — Grundgerüst, Design und Login

**Status:** ✅ Fertig (06.11.2026)

## Ziel

Als Familienmitglied möchte ich die App auf Handy, iPad und Mac öffnen und mich einmal per E-Mail-Code anmelden, damit nur unsere Familie die Rezepte sieht.
Dazu gehören das Airbnb-Theme (Phase 1b, bisher offen), shadcn/ui, das App-Layout und die Nutzererkennung über Cloudflare Access.

## Abhängigkeiten

- Phase 0 (OpenNext läuft lokal), D1 `familien-kochapp` angelegt (EU-Jurisdiktion, Binding `DB`)
- Marco: Cloudflare Zero Trust aktivieren (Free-Plan, bis 50 Nutzer), Team-Name festlegen, E-Mail-Adressen der Familie als Access-Policy eintragen

## Out of Scope

- Eigenes Login-System, Passwörter, Registrierung (macht Access)
- Rollen und Rechte außer „Familienmitglied“ (Freigabe-Recht für Allergie-Ersatz kommt in Spec 06)
- Rezepte selbst (Spec 02)

## Edge Cases

- Aufruf ohne Access (lokal, `workers.dev` ungeschützt, gefälschter Header): Der Server vertraut nie nur dem Header `Cf-Access-Authenticated-User-Email`, sondern prüft das JWT `Cf-Access-Jwt-Assertion` gegen die Team-Zertifikate (Audience-Tag). Ohne gültiges JWT zeigen Seiten „Kein Zugang“ ohne Daten. Route Handler und Server Actions antworten ab Spec 02 mit 401. Das experimentelle `unauthorized()` bleibt aus (siehe Debrief).
- Lokale Entwicklung: Dev-Nutzer nur, wenn `NODE_ENV=development` gilt. Im Production-Build darf das nie greifen.
- Erstes Login einer neuen Adresse: Nutzer wird in `users` angelegt, ein zweiter Aufruf erzeugt keine Dublette (`email` UNIQUE).
- Session läuft ab: Access leitet neu zum Code-Login, die App zeigt keine kaputte Seite.

## Akzeptanzkriterien

- [x] `npx shadcn@latest init` ausgeführt, Basis-Komponenten (button, input, label, card, badge, sheet) vorhanden
- [x] Airbnb-Farben, Radien und Schrift aus `./DESIGN.md` als CSS-Variablen in `src/app/globals.css`. Statt Airbnb Cereal eine freie Schrift, kein Markenname und kein Logo.
- [x] D1-Migration `0001_users.sql` (id, email UNIQUE, display_name, created_at) lokal und remote angewendet
- [x] Hilfsfunktion `getCurrentUser()` (Server) prüft das Access-JWT und liefert den Nutzer oder 401. Dazu gibt es Tests.
- [x] Layout mit Kopfzeile (App-Name, Nutzername) und Platz für die Navigation, mobile-first
- [x] Deploy auf Workers mit Access-Schutz. Ein fremder Browser ohne freigegebene Adresse kommt nicht rein (302 zum Access-Login geprüft).
- [x] Policy „Familie“ (E-Mail-Code), Test auf iPad-Safari ✅. Weitere Familien-Adressen werden als Daten nachgetragen, nicht im Code.

## Tasks

- [x] Context7: OpenNext-Bindings (`getCloudflareContext`) und Access-JWT-Prüfung nachlesen
- [x] shadcn init und Theme aus DESIGN.md übertragen
- [x] `migrations/0001_users.sql` mit `wrangler d1 migrations` anlegen
- [x] `src/lib/access.ts` (JWT-Prüfung mit `jose`, 10 Tests) + `src/lib/auth.ts` (Nutzer aus D1)
- [x] Layout und Startseite (leerer Zustand „Noch keine Rezepte“)
- [x] Erster Deploy ✅ (https://familien-kochapp.marcolemke78.workers.dev), Access-Anwendung auf die Worker-Domain, Test mit erlaubter und fremder Adresse

## Validation

- Schema, Auth, UI, Deployment (`rules/verification.md`)
- Mobile-Check 375/768/1280 px, iPad-Safari

## Relevante Rules / Skills

- `rules/design-system.md`, `./DESIGN.md`
- `rules/code-conventions.md`
- `superpowers:test-driven-development` (auth.ts)

## Debrief

Siehe `learning.md` (06.11.2026). Kernpunkte: Chrome-Übersetzung bringt das Dashboard zum Absturz; Policy mit „Emails“ statt „Cloudflare account“; JWT immer selbst prüfen.

