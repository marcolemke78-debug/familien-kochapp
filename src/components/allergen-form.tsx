"use client";
// Formular "Allergen hinzufügen" auf der Profilseite
import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addAllergenRule, type AllergenFormState } from "@/app/profil/actions";

const MODES = [
  { value: "always", label: "Immer", hint: "roh und gegart" },
  { value: "raw_only", label: "Nur roh", hint: "gegart verträglich" },
] as const;

export function AllergenForm() {
  const [state, formAction, pending] = useActionState<AllergenFormState, FormData>(addAllergenRule, {});
  const errors = state.fieldErrors ?? {};
  // Nach Erfolg leer (React setzt das Formular zurück), nach Fehler mit den alten Eingaben
  const values = state.values ?? { name: "", synonyms: "", mode: "always" };

  return (
    <form action={formAction} className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-float sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight">Neu eintragen</h2>

      <div className="space-y-2">
        <Label htmlFor="name">Was verträgst du nicht?</Label>
        <Input id="name" name="name" required maxLength={60} aria-invalid={!!errors.name} defaultValue={values.name} aria-describedby="name-error" autoComplete="off" />
        {errors.name && (
          <p id="name-error" className="text-sm text-destructive">
            {errors.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="synonyms">Steckt auch in … (optional)</Label>
        <Input id="synonyms" name="synonyms" aria-invalid={!!errors.synonyms} defaultValue={values.synonyms} aria-describedby="synonyms-hint" autoComplete="off" />
        <p id="synonyms-hint" className={errors.synonyms ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {errors.synonyms ?? "Andere Namen, Mischprodukte oder Aufstriche, mit Komma getrennt."}
        </p>
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
