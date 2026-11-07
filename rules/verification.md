# Verification — Stopp-Kriterien pro Arbeitspaket-Typ

Nach jedem Arbeitspaket: passende Checkliste abarbeiten, alle Punkte ✅, dann erst Spec-Status auf ✅ setzen.

## Supabase-Schema

- [ ] Tabellen existieren (via Supabase MCP geprüft)
- [ ] Row Level Security (RLS) aktiv auf allen Tabellen
- [ ] Policies definiert: User kann eigene Daten lesen/schreiben, ggf. öffentliche Felder
- [ ] TypeScript-Types neu generiert (`src/lib/database.types.ts`)
- [ ] Foreign Keys + Cascade-Verhalten geprüft

## Auth-Flow (Sign-Up / Sign-In / Sign-Out)

- [ ] Sign-Up mit Email+Passwort funktioniert (Test-User angelegt)
- [ ] Sign-In mit Test-User funktioniert
- [ ] Sign-Out invalidiert Session
- [ ] Middleware refresht Session bei abgelaufenen Cookies
- [ ] Cookie-Handling über `@supabase/ssr` (nicht aus Gedächtnis — Context7 MCP konsultieren)
- [ ] Passwort-Mindest-Länge enforced

## UI-Komponente

- [ ] **Visual Verification** via `browser-use --headed` durchgeführt (Screenshot gemacht). **3-4 Iterationen normal, max 5 — danach STOP und User fragen, nicht endlos iterieren**
- [ ] **Drei Viewports geprüft:** 375px (iPhone Mini), 768px (iPad), 1280px (Desktop). Kein Overflow, Tap-Targets ≥44px, Text nicht abgeschnitten
- [ ] **Hover-State** auf interaktiven Elementen
- [ ] **Focus-State** sichtbar (Tab-Navigation testbar)
- [ ] **Keine harten #000/#fff** — Neutrals abgestuft
- [ ] **Empty/Loading/Error-States** rudimentär vorhanden
- [ ] **Transitions** 150ms+ ease-out
- [ ] **Microinteractions-ready** — Komponente hat klare `:hover`/`:focus`-Hooks und (bei Bedarf) motion-Komponenten als Wrapper. Die eigentlichen Microinteractions (Hover-Glow, Scale-on-Press, Card-Hover-Lift) kommen in Phase 5 Polish — hier nur strukturell vorbereitet

## API-Route / Server Action

- [ ] Status-Codes korrekt (200/201/400/401/403/404/500)
- [ ] Input-Validation (Zod oder Equivalent)
- [ ] Server-Side-Validation auch wenn Client validiert
- [ ] Error-Handling explizit (try/catch oder Result-Type)
- [ ] Tests vorhanden (TDD via `superpowers:test-driven-development`)

## Deployment

- [ ] Live-URL erreichbar
- [ ] Env-Vars im Vercel-Dashboard gesetzt
- [ ] Sign-Up auf Production testbar
- [ ] Preview-Deployment via Feature-Branch funktioniert
- [ ] **Token-Leak-Check:** `git log --all -- .env.local` und `git log --all -- .mcp.json` leer
