"use client";
// Portionen-Stepper: rechnet die Zutaten live um (Küchen-Rundung aus src/lib/scale.ts)
import { useState } from "react";
import { CircleCheck, Minus, OctagonAlert, Plus, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scaleIngredient, formatQuantity } from "@/lib/scale";
import type { Ingredient } from "@/lib/ingredients";
import type { IngredientMark } from "@/lib/allergens";
import { cn } from "@/lib/utils";

// Farbstreifen links als inset-Schatten, damit die Mengenspalte nicht verrutscht
// marks: Allergie-Markierung je Zutat (gleiche Reihenfolge), vom Server berechnet
type Props = { ingredients: Ingredient[]; baseServings: number; marks?: (IngredientMark | null)[] };

const MARK_STYLE = {
  red: { row: "bg-destructive/8 shadow-[inset_4px_0_0_var(--color-destructive)]", text: "text-destructive", Icon: OctagonAlert },
  yellow: { row: "bg-amber-500/10 shadow-[inset_4px_0_0_var(--color-amber-500)]", text: "text-amber-700 dark:text-amber-400", Icon: TriangleAlert },
  ok: { row: "bg-emerald-600/8 shadow-[inset_4px_0_0_var(--color-emerald-600)]", text: "text-emerald-700 dark:text-emerald-400", Icon: CircleCheck },
} as const;

export function ScaledIngredients({ ingredients, baseServings, marks = [] }: Props) {
  const [servings, setServings] = useState(baseServings);
  const factor = servings / baseServings;

  return (
    <section aria-labelledby="zutaten" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="zutaten" className="text-2xl font-semibold tracking-tight">
          Zutaten
        </h2>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-float">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setServings((s) => Math.max(1, s - 1))}
            disabled={servings <= 1}
            aria-label="Eine Portion weniger"
          >
            <Minus />
          </Button>
          <output aria-live="polite" className="min-w-24 text-center text-base font-semibold tabular-nums">
            {servings} {servings === 1 ? "Portion" : "Portionen"}
          </output>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setServings((s) => Math.min(50, s + 1))}
            disabled={servings >= 50}
            aria-label="Eine Portion mehr"
          >
            <Plus />
          </Button>
        </div>
      </div>

      {factor !== 1 && (
        <p className="text-sm text-muted-foreground">
          Umgerechnet von {baseServings} {baseServings === 1 ? "Portion" : "Portionen"}, sinnvoll gerundet.{" "}
          <button
            type="button"
            onClick={() => setServings(baseServings)}
            className="min-h-11 rounded-md font-medium text-primary underline-offset-4 transition-colors duration-150 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Zurücksetzen
          </button>
        </p>
      )}

      <ul className="divide-y divide-border rounded-[1.25rem] border border-border bg-card">
        {ingredients.map((ingredient, index) => {
          if (ingredient.heading) {
            return (
              <li key={index} className="bg-muted/60 px-5 pt-5 pb-2 text-base font-semibold tracking-tight first:rounded-t-[1.25rem]">
                {ingredient.name}
              </li>
            );
          }
          const scaled = scaleIngredient(ingredient, factor);
          const amount =
            scaled.quantity === null
              ? null
              : scaled.quantityMax === null
                ? formatQuantity(scaled.quantity, scaled.unit)
                : `${formatQuantity(scaled.quantity, scaled.unit)}–${formatQuantity(scaled.quantityMax, scaled.unit)}`;
          const mark = marks[index] ?? null;
          const style = mark ? MARK_STYLE[mark.level] : null;
          return (
            <li key={index} className={cn("flex items-baseline gap-4 px-5 py-3.5 text-lg first:rounded-t-[1.25rem] last:rounded-b-[1.25rem]", style?.row)}>
              <span className="w-24 shrink-0 font-semibold tabular-nums">
                {[amount, scaled.unit].filter(Boolean).join(" ")}
              </span>
              <div className="min-w-0 flex-1">
                <span>{scaled.name}</span>
                {mark && style && <MarkDetails mark={mark} className={style.text} Icon={style.Icon} />}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Für wen ist die Zutat ein Problem, und gibt es freigegebenen Ersatz?
function MarkDetails({ mark, className, Icon }: { mark: IngredientMark; className: string; Icon: React.ElementType }) {
  return (
    <ul className={cn("mt-1 space-y-0.5 text-sm font-medium", className)}>
      {mark.people.map((p, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {p.replacement
              ? `Für ${p.person}: ${p.replacement}`
              : p.level === "red"
                ? `Enthält ${p.allergen} (${p.person})`
                : `Prüfen: roh oder gegart? ${p.allergen} (${p.person})`}
          </span>
        </li>
      ))}
    </ul>
  );
}
