"use client";
// Spec 06: "Diese Zutaten besser nicht" → Zutaten antippen → KI-Vorschläge → selbst freigeben.
// Freigegeben wird immer nur für die angemeldete Person (der Server prüft das).
import { useState, useTransition } from "react";
import { Check, Replace, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { approveSubstitute, removeSubstitute, suggestSubstitutes, type SuggestResult } from "@/app/rezepte/substitute-actions";
import { cn } from "@/lib/utils";

export type SubstituteIngredient = {
  position: number; // Index in recipe.ingredients
  name: string; // ohne Menge, dafür wird freigegeben
  line: string; // mit Menge, zum Anzeigen
  mine: boolean; // laut eigenem Profil betroffen → vorausgewählt
  myReplacement: string | null; // schon freigegebener Ersatz
};

type Suggestions = Extract<SuggestResult, { ok: true }>["suggestions"];

export function SubstituteSheet({ recipeId, ingredients }: { recipeId: number; ingredients: SubstituteIngredient[] }) {
  const [selected, setSelected] = useState<Set<number>>(() => new Set(ingredients.filter((i) => i.mine && !i.myReplacement).map((i) => i.position)));
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [approved, setApproved] = useState<Record<string, string>>({}); // name → gerade freigegebener Ersatz
  const [error, setError] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();
  const [saving, startSave] = useTransition();

  function toggle(position: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(position)) next.delete(position);
      else next.add(position);
      return next;
    });
  }

  function search() {
    setError(null);
    startSearch(async () => {
      const result = await suggestSubstitutes(recipeId, [...selected].sort((a, b) => a - b));
      if (result.ok) setSuggestions(result.suggestions);
      else setError(result.error);
    });
  }

  function approve(name: string, replacement: string, note: string) {
    setError(null);
    startSave(async () => {
      const result = await approveSubstitute(recipeId, { ingredient: name, replacement, note });
      if (result.message) setError(result.message);
      else setApproved((a) => ({ ...a, [name]: replacement }));
    });
  }

  function remove(name: string) {
    setError(null);
    startSave(async () => {
      const result = await removeSubstitute(recipeId, name);
      if (result.message) setError(result.message);
    });
  }

  const existing = ingredients.filter((i) => i.myReplacement);

  return (
    <Sheet onOpenChange={(open) => !open && (setSuggestions(null), setApproved({}), setError(null))}>
      <SheetTrigger render={<Button variant="outline" className="w-full" />}>
        <Replace aria-hidden />
        Diese Zutaten besser nicht
      </SheetTrigger>
      <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl">Ersatz für mich</SheetTitle>
          <SheetDescription>
            {suggestions
              ? "Gib frei, was für dich passt. Andere sehen den Ersatz dann auch im Rezept."
              : "Tippe an, was du lieber nicht isst. Claude schlägt Ersatz vor, die App prüft ihn gegen dein Allergie-Profil."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {!suggestions ? (
            <>
              <ul className="flex flex-wrap gap-2" aria-label="Zutaten">
                {ingredients.map((i) => {
                  const on = selected.has(i.position);
                  return (
                    <li key={i.position}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(i.position)}
                        className={cn(
                          "min-h-11 rounded-full border px-4 py-2 text-left text-sm font-medium transition-colors duration-150 ease-out outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]",
                          on ? "border-primary bg-primary/10 text-primary" : "border-border bg-card hover:border-primary/50",
                        )}
                      >
                        {on && <Check className="mr-1 inline size-4 align-[-3px]" aria-hidden />}
                        {i.line}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Button onClick={search} disabled={searching || selected.size === 0} className="w-full">
                <Sparkles aria-hidden />
                {searching ? "Claude sucht Ersatz …" : `Ersatz vorschlagen (${selected.size})`}
              </Button>
            </>
          ) : (
            <>
              {suggestions.map((s) => (
                <section key={s.ingredient} className="space-y-2">
                  <h3 className="font-semibold">Statt {s.ingredient}</h3>
                  {s.options.length === 0 && (
                    <p className="text-sm text-muted-foreground">Kein passender Ersatz gefunden, der zu deinem Profil passt.</p>
                  )}
                  {s.options.map((o) => {
                    const done = approved[s.name] === o.replacement;
                    return (
                      <div key={o.replacement} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{o.replacement}</p>
                          {o.note && <p className="text-sm text-muted-foreground">{o.note}</p>}
                        </div>
                        <Button size="sm" variant={done ? "secondary" : "default"} disabled={saving || done} onClick={() => approve(s.name, o.replacement, o.note)}>
                          {done ? <Check aria-hidden /> : null}
                          {done ? "Freigegeben" : "Freigeben"}
                        </Button>
                      </div>
                    );
                  })}
                </section>
              ))}
              <Button variant="ghost" onClick={() => setSuggestions(null)} className="w-full">
                Andere Zutaten wählen
              </Button>
            </>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          {existing.length > 0 && !suggestions && (
            <section className="space-y-2 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Schon freigegeben</h3>
              <ul className="space-y-1">
                {existing.map((i) => (
                  <li key={i.position} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 text-sm">
                      {i.name} → <span className="font-medium">{i.myReplacement}</span>
                    </span>
                    <Button variant="ghost" size="icon" className="size-11 rounded-full" disabled={saving} onClick={() => remove(i.name)}>
                      <X aria-hidden />
                      <span className="sr-only">Ersatz für {i.name} entfernen</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
