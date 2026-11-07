// Spec 07: Liest den Bundeslebensmittelschlüssel (BLS 4.0) und schreibt eine SQL-Datei für D1.
// Quelle: Max Rubner-Institut (2025): Bundeslebensmittelschlüssel (BLS), Version 4.0, Karlsruhe,
// DOI 10.25826/Data20251217-134202-0, Lizenz CC BY 4.0. Download: https://www.blsdb.de/download
//
// Ablauf (siehe ADR-004, die Rohdaten kommen nicht ins Repo):
//   1. ZIP BLS_4_0_2025_DE.zip herunterladen und entpacken
//   2. node scripts/import-bls.mjs <Pfad>/BLS_4_0_Daten_2025_DE.xlsx
//   3. npx wrangler d1 execute familien-kochapp --local  --file .wrangler/bls_foods.sql
//      npx wrangler d1 execute familien-kochapp --remote --file .wrangler/bls_foods.sql
import { mkdirSync, writeFileSync } from "node:fs";
import ExcelJS from "exceljs";

const OUT = ".wrangler/bls_foods.sql";
// Spalten werden über den Kürzel am Anfang der Überschrift gefunden, nicht über die Position
const COLUMNS = { code: "BLS Code", name: "Lebensmittelbezeichnung", kcal: "ENERCC ", protein: "PROT625 ", fat: "FAT ", carbs: "CHO ", sugar: "SUGAR " };

const file = process.argv[2];
if (!file) {
  console.error("Aufruf: node scripts/import-bls.mjs <Pfad zu BLS_4_0_Daten_2025_DE.xlsx>");
  process.exit(1);
}

// "TR" = Spuren, "<LOD"/"<LOQ" = unter der Messgrenze, "-" = kein Wert → 0
function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^(TR|<LO[DQ].*|-)$/.test(value.trim())) return 0;
  throw new Error(`Unerwarteter Wert: ${JSON.stringify(value)}`);
}

// Gleiche Regeln wie tokenize() in src/lib/allergens.ts: klein, Umlaute vereinfacht, nur Buchstaben/Ziffern
const searchText = (text) =>
  String(text).toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss").split(/[^a-z0-9]+/).filter(Boolean).join(" ");

const sql = (text) => `'${String(text).replaceAll("'", "''")}'`;

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(file);
const sheet = workbook.worksheets[0];
const header = sheet.getRow(1).values; // Index ab 1
const index = Object.fromEntries(
  Object.entries(COLUMNS).map(([key, prefix]) => {
    const i = header.findIndex((h) => typeof h === "string" && (h === prefix || h.startsWith(prefix)));
    if (i < 0) throw new Error(`Spalte nicht gefunden: ${prefix}`);
    return [key, i];
  }),
);

const rows = [];
sheet.eachRow((row, n) => {
  if (n === 1) return;
  const v = row.values;
  const values = ["kcal", "protein", "fat", "carbs", "sugar"].map((k) => toNumber(v[index[k]]));
  rows.push(`(${sql(v[index.code])}, ${sql(v[index.name])}, ${sql(searchText(v[index.name]))}, ${values.join(", ")})`);
});

// In Blöcken einfügen, damit einzelne SQL-Anweisungen nicht zu groß werden
// Upsert statt DELETE: ingredient_nutrition verweist per Fremdschlüssel auf bls_foods
const lines = [];
for (let i = 0; i < rows.length; i += 200) {
  lines.push(`INSERT INTO bls_foods (code, name, search, kcal, protein, fat, carbs, sugar) VALUES\n${rows.slice(i, i + 200).join(",\n")}\nON CONFLICT (code) DO UPDATE SET name = excluded.name, search = excluded.search, kcal = excluded.kcal, protein = excluded.protein, fat = excluded.fat, carbs = excluded.carbs, sugar = excluded.sugar;`);
}
mkdirSync(".wrangler", { recursive: true });
writeFileSync(OUT, lines.join("\n") + "\n");
console.log(`${rows.length} Lebensmittel → ${OUT}`);
