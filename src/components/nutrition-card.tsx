// Spec 07: Nährwerte pro Portion auf der Rezeptseite. Server Component, rechnet frisch aus Zutaten + Zuordnungen.
import { Info } from "lucide-react";
import { NutritionSheet } from "@/components/nutrition-sheet";
import { LOW_CARB_MAX_CARBS, type NutritionResult } from "@/lib/nutrition";

const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: n < 10 ? 1 : 0 });

export function NutritionCard({ recipeId, result }: { recipeId: number; result: NutritionResult }) {
  if (result.mapped === 0) {
    return (
      <section aria-labelledby="naehrwerte" className="space-y-3 rounded-[1.25rem] border border-border bg-card p-4">
        <h2 id="naehrwerte" className="text-lg font-semibold tracking-tight">
          Nährwerte pro Portion
        </h2>
        <p className="text-sm text-muted-foreground">Noch nicht berechnet. Claude schlägt für jede Zutat einen Eintrag vor, du prüfst und übernimmst.</p>
        <NutritionSheet recipeId={recipeId} label="Nährwerte berechnen" />
      </section>
    );
  }

  const v = result.perServing;
  const rows = [
    { label: "Eiweiß", value: v.protein },
    { label: "Fett", value: v.fat },
    { label: "Kohlenhydrate", value: v.carbs },
    { label: "davon Zucker", value: v.sugar, sub: true },
  ];
  const lowCarb = result.complete && v.carbs <= LOW_CARB_MAX_CARBS;

  return (
    <section aria-labelledby="naehrwerte" className="space-y-4 rounded-[1.25rem] border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="naehrwerte" className="text-lg font-semibold tracking-tight">
          Nährwerte pro Portion
        </h2>
        {lowCarb && <span className="rounded-full bg-emerald-600/10 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">Low Carb</span>}
      </div>
      <p className="text-4xl font-semibold tracking-tight tabular-nums">
        {result.complete ? "" : "ca. "}
        {fmt(v.kcal)} <span className="text-lg font-medium text-muted-foreground">kcal</span>
      </p>
      <dl className="divide-y divide-border">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between py-2 tabular-nums">
            <dt className={r.sub ? "pl-4 text-muted-foreground" : ""}>{r.label}</dt>
            <dd className="font-medium">{fmt(r.value)} g</dd>
          </div>
        ))}
      </dl>
      {!result.complete && (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-500/15 p-3 text-sm font-medium text-amber-800 dark:text-amber-300">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Unvollständig, ohne: {result.missing.join(", ")}
        </p>
      )}
      <NutritionSheet recipeId={recipeId} label={result.complete ? "Zuordnung ändern" : "Fehlende Zutaten zuordnen"} />
      <p className="text-xs text-muted-foreground">Quelle: Max Rubner-Institut, Bundeslebensmittelschlüssel (BLS) 4.0, CC BY 4.0. Werte sind Richtwerte.</p>
    </section>
  );
}
