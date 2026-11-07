# Code-Konventionen

## Naming

- **Dateinamen:** kebab-case (`my-component.tsx`, `use-auth.ts`)
- **Komponenten:** PascalCase (`LinkCard`, `AuthForm`)
- **Hooks:** `use`-Präfix (`useSession`, `useLinks`)
- **Server-Komponenten:** kein "use client" am Anfang
- **Client-Komponenten:** `"use client"` als erste Zeile

## TypeScript

- **strict mode** aktiv (`tsconfig.json`)
- **Kein `any`** — wenn unvermeidbar, mit Kommentar warum
- **Kein `@ts-ignore`** — nutze `@ts-expect-error` mit Begründung
- **Database-Types** aus `src/lib/database.types.ts` (auto-generiert)

## Komponenten

- **Server Components by default** — Client nur wo interaktiv (Event-Handler, useState, useEffect)
- **Props-Typen explizit** definieren, kein impliziter `any`
- **Async Server Components** für Daten-Fetching

## Code-Qualität

- **Kein `console.log` in committetem Code** — nur während Debug, vor Commit entfernen
- **Server Actions / API Routes** validieren Input (z.B. via Zod) sowohl client- als auch server-seitig
- **Fehlerbehandlung explizit:** try/catch in Server Actions, error.tsx für Routen
