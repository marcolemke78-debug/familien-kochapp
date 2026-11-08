"use client";
// Spec 10: "Mit beiden Geräten kochen" → Vorschau (Nutzen, Schritte mit Gerät und "gleichzeitig") → Speichern.
// Grenzwerte werden beim Tippen geprüft (gleiche Funktion wie auf dem Server: checkComboStep).
import { useState, useTransition } from "react";
import { AlertTriangle, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { planCombo, saveCombo } from "@/app/rezepte/actions";
import { checkComboStep, usesBothDevices, type Combo, type ComboStep } from "@/lib/combo";
import type { AirfryerSettings, Tm6Settings } from "@/lib/convert";
import { DEVICES, type Device } from "@/lib/recipe-meta";
import { AirfryerFields, DEFAULTS, Tm6Fields } from "@/components/device-converter";

type Props = {
  recipeId: number;
  again?: boolean; // es gibt schon eine Kombi → "Beide neu planen"
  tested?: boolean; // die vorhandene Kombi ist getestet → Ersetzen nur mit Bestätigung
};

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-base transition-colors duration-150 ease-out outline-none hover:border-foreground/40 focus-visible:ring-3 focus-visible:ring-ring/50";

export function ComboConverter({ recipeId, again = false, tested = false }: Props) {
  const [combo, setCombo] = useState<Combo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);
  // Zählt hoch, wenn sich die Schrittliste verschiebt (Entfernen, neu planen) → Felder starten neu
  const [version, setVersion] = useState(0);
  const [planning, startPlan] = useTransition();
  const [saving, startSave] = useTransition();

  function plan() {
    setError(null);
    startPlan(async () => {
      const result = await planCombo(recipeId);
      if (result.ok) {
        setCombo(result.combo);
        setVersion((v) => v + 1);
      } else setError(result.error);
    });
  }

  function updateStep(index: number, step: ComboStep) {
    setCombo((c) => c && { ...c, steps: c.steps.map((s, i) => (i === index ? step : s)) });
  }

  const checks = combo?.steps.map(checkComboStep) ?? [];
  const bothUsed = !!combo && usesBothDevices(combo.steps);
  const hasErrors =
    !combo || !combo.benefit.trim() || !bothUsed || checks.some((c) => c.errors.length > 0) || combo.steps.some((s) => !s.text.trim());
  const needsConfirm = tested && !replace;

  function save() {
    if (!combo || hasErrors || needsConfirm) return;
    setError(null);
    startSave(async () => {
      const result = await saveCombo(recipeId, combo, replace);
      if (result?.message) setError(result.message);
    });
  }

  if (!combo) {
    return (
      <div className="space-y-2">
        <Button type="button" variant={again ? "ghost" : "outline"} size="sm" disabled={planning} onClick={plan}>
          {again ? <RefreshCw aria-hidden /> : <Sparkles aria-hidden />}
          {planning ? "KI plant für beide Geräte …" : again ? "Beide neu planen" : "Mit beiden Geräten kochen"}
        </Button>
        {planning && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Dauert meist 10–20 Sekunden.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="w-full basis-full space-y-5 rounded-[1.25rem] border border-primary/30 bg-linear-to-br from-primary/10 to-card p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="size-5 text-primary" aria-hidden />
            Vorschau: TM6 und Heißluft zusammen
          </p>
          <p className="text-sm text-muted-foreground">
            Von KI geplant. Bitte prüfen und bei Bedarf ändern. Erst „Speichern“ legt die Version an, das Original bleibt unverändert.
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => setCombo(null)} aria-label="Vorschau verwerfen">
          <X />
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="combo-benefit" className="text-base">
          Was bringt es?
        </Label>
        <Input
          id="combo-benefit"
          value={combo.benefit}
          maxLength={200}
          aria-invalid={!combo.benefit.trim()}
          onChange={(e) => setCombo({ ...combo, benefit: e.target.value })}
        />
      </div>

      <ol className="space-y-4">
        {combo.steps.map((step, index) => {
          const id = `k${version}-${index}`;
          const label = DEVICES.find((d) => d.value === step.device)?.short;
          return (
            <li key={id} className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                <span
                  aria-hidden
                  className="mt-2 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold"
                >
                  {index + 1}
                </span>
                <Textarea
                  value={step.text}
                  rows={3}
                  maxLength={2000}
                  aria-label={`Schritt ${index + 1}`}
                  aria-invalid={!step.text.trim()}
                  onChange={(e) => updateStep(index, { ...step, text: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={combo.steps.length <= 1}
                  onClick={() => {
                    setCombo({ ...combo, steps: combo.steps.filter((_, i) => i !== index) });
                    setVersion((v) => v + 1);
                  }}
                  aria-label={`Schritt ${index + 1} entfernen`}
                  className="hover:text-destructive"
                >
                  <Trash2 />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,12rem)_1fr] sm:items-end">
                <div className="space-y-1">
                  <Label htmlFor={`d-${id}`} className="text-sm text-muted-foreground">
                    Gerät
                  </Label>
                  <select
                    id={`d-${id}`}
                    className={selectClass}
                    value={step.device ?? ""}
                    onChange={(e) => {
                      const device = (e.target.value || null) as Device | null;
                      updateStep(index, { ...step, device, settings: null }); // Einstellungen passen nicht zum neuen Gerät
                    }}
                  >
                    <option value="">ohne Gerät</option>
                    {DEVICES.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.short}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-x-6">
                  {step.device && (
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={step.settings !== null}
                        onChange={(e) =>
                          updateStep(index, { ...step, settings: e.target.checked && step.device ? DEFAULTS[step.device] : null })
                        }
                        className="size-5 accent-primary"
                      />
                      Mit {label}-Einstellung
                    </label>
                  )}
                  {index > 0 && (
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={step.parallel}
                        onChange={(e) => updateStep(index, { ...step, parallel: e.target.checked })}
                        className="size-5 accent-primary"
                      />
                      Läuft währenddessen (parallel)
                    </label>
                  )}
                </div>
              </div>

              {step.settings &&
                step.device &&
                (step.device === "tm6" ? (
                  <Tm6Fields index={id} settings={step.settings as Tm6Settings} onChange={(s) => updateStep(index, { ...step, settings: s })} />
                ) : (
                  <AirfryerFields
                    index={id}
                    settings={step.settings as AirfryerSettings}
                    onChange={(s) => updateStep(index, { ...step, settings: s })}
                  />
                ))}

              {checks[index]?.errors.map((m) => (
                <p key={m} role="alert" className="text-sm font-medium text-destructive">
                  {m}
                </p>
              ))}
              {checks[index]?.warnings.map((m) => (
                <p key={m} className="flex items-start gap-2 text-sm font-medium text-[#8a5a00] dark:text-[#f0c060]">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {m}
                </p>
              ))}
            </li>
          );
        })}
      </ol>

      {!bothUsed && (
        <p role="alert" className="text-sm font-medium text-destructive">
          Mindestens ein Schritt braucht den TM6 und einer die Heißluft.
        </p>
      )}

      {tested && (
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="mt-0.5 size-5 accent-primary" />
          <span>
            <span className="font-semibold">Getestete Version ersetzen</span>
            <span className="block text-muted-foreground">Die neue Version gilt dann wieder als „von KI geplant“.</span>
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="lg" disabled={saving || hasErrors || needsConfirm} onClick={save}>
          {saving ? "Wird gespeichert …" : "Kombi-Version speichern"}
        </Button>
        <Button type="button" variant="ghost" size="lg" disabled={saving || planning} onClick={plan}>
          <RefreshCw aria-hidden />
          {planning ? "Plant neu …" : "Nochmal planen"}
        </Button>
      </div>
    </div>
  );
}
