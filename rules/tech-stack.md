# Tech-Stack

## Commands

| Zweck | Command |
|---|---|
| Dev-Server | `npm run dev` |
| Build | `npm run build` |
| Typecheck | `npm run typecheck` (oder `tsc --noEmit`) |
| Lint | `npm run lint` |
| shadcn-Komponente hinzufügen | `npx shadcn@latest add <name>` |
| Supabase-Types generieren | `npx supabase gen types typescript --project-id <id> --schema public > src/lib/database.types.ts` |
| Visual Verification | `browser-use --headed <url>` |

## MCPs (projekt-scoped)

- **Supabase MCP** — Schema-Operationen, SQL, Type-Gen. **OAuth-Weg seit Frühjahr 2026 Standard:**
  - Supabase-Dashboard → "Connect" → "Get connected → MCP" → Client "Claude Code" wählen → generierten `claude mcp add --scope project --transport http ...`-Befehl im Projekt-Root ausführen
  - Erst-Auth: in Claude `/mcp` → `supabase` → Enter → Browser-Flow
  - **Fallback (kein Connect-Button):** Personal Access Token (PAT, `sbp_...`) aus Supabase Account Settings → Access Tokens → "Generate new token". **NICHT** der Service-Role-Token (JWT, `eyJ...`) aus den Project Settings — der hat andere Rechte und funktioniert mit dem MCP-Server nicht zuverlässig.
    ```bash
    claude mcp add supabase --scope project \
      --env SUPABASE_ACCESS_TOKEN=<pat-sbp...> \
      -- npx @supabase/mcp-server-supabase
    ```
- **Context7 MCP** — aktuelle Framework-Docs (Next.js 16, Supabase SSR)
  ```bash
  claude mcp add context7 --scope project \
    -- npx -y @upstash/context7-mcp
  ```

**`.mcp.json`-Handling:**
- Bei OAuth: token-frei, prinzipiell committable, aber konservativ trotzdem in `.gitignore` lassen (kompatibel mit Token-Fallback)
- Bei PAT-Fallback: MUSS in `.gitignore` — sonst Token im Repo

## Ordner-Struktur

```
src/
├── app/                  ← App Router Pages + Server Components
│   ├── layout.tsx
│   ├── page.tsx          ← Landing-Page
│   ├── (auth)/           ← Auth-Routen (Sign-Up, Sign-In)
│   ├── (dashboard)/      ← User-Dashboard
│   └── u/[username]/     ← Öffentliche User-Pages
├── components/           ← UI-Komponenten
│   ├── ui/               ← shadcn-Komponenten (auto-generiert)
│   └── ...               ← Eigene Komponenten
└── lib/
    ├── database.types.ts ← Auto-generierte Supabase-Types
    ├── supabase/         ← Supabase-Clients (browser, server)
    └── ...
```

## Stack-Versionen (Stand 2026-05)

- Node 20+
- Next.js 16 (App Router)
- React 19
- TypeScript strict
- Tailwind CSS v4
- shadcn/ui (CLI-installiert)
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- Vercel (Hobby Tier)
