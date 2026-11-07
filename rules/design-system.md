# Design-System

UI-Regeln für dieses Projekt. Verbindlich für alle interaktiven Elemente und Layouts.

## Pflicht-Regeln (gelten immer)

- **Dark Mode von Start an**, nicht als Nachgedanke
- **Keine harten #000/#fff** — abgestufte Neutrals nutzen
- **Hover- und Focus-State** auf jedem interaktiven Element
- **Smooth Transitions** — min. 150ms ease-out
- **Kontrast** ausreichend (tweakcn Contrast-Checker)

## Stil-Defaults (eine Referenz-`./DESIGN.md` darf sie ersetzen)

- **Keine flachen Farben** — Gradients, Abstufungen, Layering
- **rounded-2xl** als Default für Cards/Buttons (keine rechteckigen Cards)
- **Weiche, mehrschichtige Shadows**

## Ziel-Niveau (visuell)

Bento.me, Cal.com, Linear, Raycast, Vercel, Arc Browser, Framer.

**Nicht:** Default-Bootstrap, Default-shadcn-Demo, generische Listen.

## Referenz `./DESIGN.md` (optional, im Projekt-Root)

Von getdesign.md installiert (Phase 1b), Name + Kompass stehen in `CLAUDE.md` → „Design". Liefert die Stilsprache: Farben, Typografie, Abstände, Radien, Shadows, Komponenten-Look. **Vorrang:** Pflicht-Regeln > `./DESIGN.md` > Stil-Defaults. Unklare Fälle am Ein-Satz-Kompass messen. Nur Stil übernehmen — keine Logos, Markennamen oder 1:1-Nachbauten. Rohdatei ist gitignored (fremde Analyse) — fehlt sie (frischer Clone, Cloud-Session), mit `npx getdesign@latest add <name>` nachinstallieren.

## Theming-Architektur (zweistufig)

- **Ebene 1 — globale Design-Tokens (statisch):** aus tweakcn.com exportiert, in `src/app/globals.css` (--background, --foreground, --radius, --shadow-* etc.). Single Source of Truth.
- **Ebene 2 — per-User-Accent (dynamisch):** nur `--accent` wird pro Public-Page überschrieben (inline style auf `<html>` oder Layout-Wrapper).

**Nur `--accent` ist dynamisch.** Alles andere bleibt statisch aus tweakcn.

## Sicherheit bei dynamischen CSS-Werten

- **Validierung als 6-stelliger Hex-String:** `/^#[0-9a-f]{6}$/i` — kein Shorthand (`#f0a`), kein Alpha-Kanal (`#rrggbbaa`). Konsistenz mit tweakcn-Export, der immer 6-stellig liefert
- **NIEMALS als raw CSS, style-String oder Inline-Expression** akzeptieren
- **Rendering nur als CSS-Variable** (`--accent: #rrggbb`), nicht als style-Injektion
- **Validation client-side (Form) UND server-side** (Server Action / DB-Insert)

## Microinteractions (Polish-Phase)

Drei Pattern, konsistent durch die App. Nicht selektiv einsetzen — entweder überall oder nirgends.

- **Hover-Glow** auf interaktiven Elementen — dezenter Outer-Glow in Accent-Farbe, niedrige Opacity, weicher Blur. **Fade-In-Dauer ~150-200ms** (smooth, kein Flackern beim Mouseover). Optional: `transition-delay: 50ms` damit der Glow bei schnellem Vorbeifahren gar nicht erst startet
- **Scale-on-Press** bei Buttons — `scale: 0.97` beim Mousedown, 100ms ease-out, zurück auf 1.0 beim Release. Tactile Feedback ohne Text
- **Card-Hover-Lift** — `translate-y: -2px` + weicherer Shadow auf Hover, 200ms ease-out. Ein Hauch hochgehoben, nicht aufdringlich

## Accessibility — `prefers-reduced-motion` (PFLICHT)

Alle Animationen MÜSSEN `prefers-reduced-motion` respektieren. Nicht optional, nicht „später" — Pflicht für Accessibility und macOS-/iOS-User mit Reduce-Motion-Setting.

CSS-Pattern:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Bei Framer-Motion-Komponenten: `useReducedMotion()`-Hook nutzen und Animationen konditional deaktivieren. Beispiel:

```tsx
import { motion, useReducedMotion } from "framer-motion"

function Card() {
  const reduce = useReducedMotion()
  return (
    <motion.div
      animate={reduce ? {} : { y: -2 }}
      transition={{ duration: reduce ? 0 : 0.2 }}
    />
  )
}
```
