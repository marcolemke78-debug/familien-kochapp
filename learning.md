# Learning Log

Debriefs nach jedem Feature: was war überraschend, was würde ich anders machen, was habe ich gelernt?

Format pro Eintrag:
```
## YYYY-MM-DD — <Feature>

- **Überraschend:** ...
- **Würde ich anders machen:** ...
- **Gelernt:** ...
```

---

## 2026-11-06 — Spec 01: Grundgerüst, Design, Login

- **Überraschend:** Chromes automatische Übersetzung hat das Cloudflare-Dashboard zum Absturz gebracht (React-Fehler `removeChild`). Headless-Chrome rendert nie schmaler als 500 px, deshalb waren die 375-px-Screenshots falsch. Abhilfe: die Seite in einem 375 px breiten iframe rendern.
- **Würde ich anders machen:** Gleich eine Policy mit „Emails“ anlegen. Die vorgefertigte Policy „Cloudflare account“ funktioniert nur mit dem Cloudflare-Passwort und ist für die Familie unbrauchbar.
- **Gelernt:** Dem Header `Cf-Access-Authenticated-User-Email` allein nie vertrauen, sondern immer das JWT gegen Team-Domain und AUD prüfen. Den Test-Nutzer gibt es nur bei `NODE_ENV=development`. Ein Test ohne Login gegen den Production-Build hat das bestätigt. Experimentelle Next-Schalter (`authInterrupts`) lasse ich weiter aus.

## 2026-11-07 — Spec 02: Rezepte

- **Überraschend:** iCloud synchronisiert den Schreibtisch und hat in `.next`/`.open-next` tausende Duplikate („routes.d 2.ts“) angelegt, die den Typcheck sprengen. Abhilfe: Build-Ordner löschen, langfristig Projekt außerhalb von iCloud.
- **Würde ich anders machen:** Mengen-Parser gleich mit deutschen Schreibweisen testen (Tausenderpunkt „1.500 g“, „1 ½“). Die hat erst das Review gefunden.
- **Gelernt:** D1 begrenzt Abfragen pro Aufruf; Listen als JSON mit `json_each` einfügen statt pro Zeile. `redirect()` gehört hinter `try/catch`. shadcn-Felder schalten ab `md` auf 14 px – auf dem iPad zoomt Safari dann.

## 2026-11-07 — Spec 03: Filter und Suche

- **Überraschend:** SQLite `LIKE` ignoriert Groß/klein nur bei a–z, nicht bei Umlauten („öl“ findet „Öl“ nicht). Lösung: zusätzlich mit großem Anfangsbuchstaben suchen.
- **Würde ich anders machen:** Mobile-Screenshot früher machen – der aktive Chip lag außerhalb der wischbaren Leiste und war unsichtbar.
- **Gelernt:** Filter als Links in der URL brauchen kein Client-JavaScript und machen Zurück-Taste und Lesezeichen gratis. `aria-pressed` gehört an Buttons, bei Links `aria-current`.

## 2026-11-07 — Spec 04: Import

- **Überraschend:** `! befehl` in Claude Code kann keine Eingabe abfragen. `wrangler secret put` meldete trotzdem „Success“ (leerer Wert), und der danach eingefügte Schlüssel landete im Chat und musste ersetzt werden. Beim zweiten Versuch lag in der Zwischenablage der kopierte Befehl statt des Schlüssels.
- **Würde ich anders machen:** Secrets nur über ein Skript setzen, das die Zwischenablage vorher prüft (beginnt mit `sk-ant-`, keine Leerzeichen) und den Wert nie ausgibt. Reihenfolge: Befehl einfügen, dann Schlüssel kopieren, dann Enter. Prettier nie ohne Projekt-Konfiguration auf eine Datei loslassen (formatiert alles auf 80 Zeichen um).
- **Gelernt:** Opus 5.5 mit Effort `low` liest Zutatengruppen, lässt Affiliate-Sätze und Nährwerte weg und kostet weniger als geschätzt. Client-Komponenten dürfen aus Server-Dateien (hier `import.ts` → `photos.ts` → Cloudflare) nur Typen importieren.
