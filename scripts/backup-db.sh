#!/bin/bash
# Sichert die Live-Datenbank (D1, remote) als SQL-Datei nach backups/.
# Läuft automatisch vor jedem "npm run deploy" und kann mit "npm run backup" einzeln gestartet werden.
# backups/ steht in .gitignore: Die Datei enthält echte Familiendaten und kommt nie ins Repo.
set -euo pipefail
mkdir -p backups
FILE="backups/$(date +%Y-%m-%d_%H%M).sql"
npx wrangler d1 export familien-kochapp --remote --output "$FILE"
# Bricht ab, wenn die Sicherung leer ist (dann läuft auch keine Migration).
[ -s "$FILE" ] || { echo "FEHLER: Backup ist leer, Abbruch."; exit 1; }
echo "Backup gesichert: $FILE ($(wc -c < "$FILE" | tr -d ' ') Bytes)"
