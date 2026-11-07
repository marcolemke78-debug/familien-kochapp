"use client";
// Formular "Allergen hinzufügen" auf der Profilseite
import { useActionState, useRef, useState, useTransition } from "react";
import { Check, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addAllergenRule, suggestSynonyms, type AllergenFormState } from "@/app/profil/actions";
import { cn } from "@/lib/utils";

// Komma-Liste im Synonym-Feld lesen
const splitTerms = (text: string) => text.split(",").map((t) => t.trim()).filter(Boolean);

const MODES = [
  { value: "always", label: "Immer", hint: "roh und gegart" },
  { value: "raw_only", label: "Nur roh", hint: "gegart verträglich" },
] as const;

export function AllergenForm() {
  const [state, formAction, pending] = useActionState<AllergenFormState, FormData>(addAllergenRule, {});
  const errors = state.fieldErrors ?? {};
  // Nach Erfolg leer (React setzt das Formular zurück), nach Fehler mit den alten Eingaben
  const values = state.values ?? { name: "", synonyms: "", mode: "always" };

  // KI-Vorschläge für andere Namen: Antippen trägt sie ins Synonym-Feld ein (oder wieder aus)
  const nameRef = useRef<HTMLInputElement>(null);
  const synonymsRef = useRef<HTMLInputElement>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggesting, startSuggest] = useTransition();

  function suggest() {
    setSuggestError(null);
    startSuggest(async () => {
      const result = await suggestSynonyms(nameRef.current?.value ?? "", splitTerms(synonymsRef.current?.value ?? ""));
      if (!result.ok) return setSuggestError(result.error);
      setSuggested(result.synonyms);
      setPicked(new Set());
      if (result.synonyms.length === 0) setSuggestError("Keine weiteren Namen gefunden.");
    });
  }

  function togglePick(term: string) {
    const input = synonymsRef.current;
    if (!input) return;
    const terms = splitTerms(input.value);
    const on = picked.has(term);
    input.value = (on ? terms.filter((t) => t !== term) : [...terms, term]).join(", ");
    setPicked((p) => {
      const next = new Set(p);
      if (on) next.delete(term);
      else next.add(term);
      return next;
    });
  }

  return (
    <form action={formAction} onSubmit={() => setSuggested([])} className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-float sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight">Neu eintragen</h2>

      <div className="space-y-2">
        <Label htmlFor="name">Was verträgst du nicht?</Label>
        <Input ref={nameRef} id="name" name="name" required maxLength={60} aria-invalid={!!errors.name} defaultValue={values.name} aria-describedby="name-error" autoComplete="off" />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive">
            {errors.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="synonyms">Steckt auch in … (optional)</Label>
        <Input ref={synonymsRef} id="synonyms" name="synonyms" aria-invalid={!!errors.synonyms} defaultValue={values.synonyms} aria-describedby="synonyms-hint" autoComplete="off" />
        <p id="synonyms-hint" className={errors.synonyms ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {errors.synonyms ?? "Andere und regionale Namen, Mischprodukte oder Aufstriche, mit Komma getrennt."}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={suggest} disabled={suggesting}>
          <Sparkles aria-hidden />
          {suggesting ? "Claude sucht …" : "Andere Namen vorschlagen"}
        </Button>
        {suggested.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Antippen, was dazugehört. Wörter, die den Namen schon enthalten, erkennt die App von selbst.</p>
            <ul className="flex flex-wrap gap-2">
              {suggested.map((term) => {
                const on = picked.has(term);
                return (
                  <li key={term}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => togglePick(term)}
                      className={cn(
                        "min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ease-out outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.97]",
                        on ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:border-primary/50",
                      )}
                    >
                      {on && <Check className="mr-1 inline size-4 align-[-3px]" aria-hidden />}
                      {term}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {suggestError && <p className="text-sm text-muted-foreground">{suggestError}</p>}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Wann ist es ein Problem?</legend>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((mode) => (
            <label
              key={mode.value}
              className="flex min-h-14 cursor-pointer flex-col justify-center rounded-2xl border border-border bg-background px-4 py-2 transition-colors duration-150 ease-out hover:border-primary/50 has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input type="radio" name="mode" value={mode.value} defaultChecked={mode.value === values.mode || (mode.value === "always" && values.mode !== "raw_only")} className="sr-only" />
              <span className="font-medium">{mode.label}</span>
              <span className="text-xs text-muted-foreground">{mode.hint}</span>
            </label>
          ))}
        </div>
        {errors.mode && <p className="text-sm text-destructive">{errors.mode}</p>}
      </fieldset>

      {state.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        <Plus aria-hidden />
        {pending ? "Wird gespeichert …" : "Hinzufügen"}
      </Button>
    </form>
  );
}
