"use client";
// Spec 05: "Für TM6 / Heißluft umrechnen" → Vorschau mit bearbeitbaren Schritten → Speichern als KI-Variante.
// Grenzwerte werden beim Tippen geprüft (gleiche Funktion wie auf dem Server: checkStep).
import { useState, useTransition } from "react";
import { AlertTriangle, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { convertRecipe, saveVariant } from "@/app/rezepte/actions";
import {
  AIRFRYER_PROGRAMS,
  AIRFRYER_ZONES,
  TM6_SPEEDS,
  checkStep,
  formatTm6Time,
  parseTm6Time,
  type AirfryerSettings,
  type Tm6Settings,
  type Variant,
  type VariantStep,
} from "@/lib/convert";
import { DEVICES, type Device } from "@/lib/recipe-meta";
import { cn } from "@/lib/utils";

type Props = {
  recipeId: number;
  device: Device;
  again?: boolean; // es gibt schon eine KI-Variante → "Neu umrechnen"
  tested?: boolean; // die vorhandene Variante ist getestet → Ersetzen nur mit Bestätigung
};

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3 text-base transition-colors duration-150 ease-out outline-none hover:border-foreground/40 focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

const TM6_TEMPS = ["37", ...Array.from({ length: 17 }, (_, i) => String(40 + i * 5))]; // 37, 40 … 120

function speedOption(speed: string) {
  if (speed === "sanft") return "Sanftrührstufe";
  if (speed === "teig") return "Teigknetstufe";
  if (speed === "turbo") return "Turbo";
  return `Stufe ${speed.replace(".", ",")}`;
}

const DEFAULTS: Record<Device, Tm6Settings | AirfryerSettings> = {
  tm6: { seconds: 60, temperature: null, varoma: false, speed: "1", reverse: false },
  airfryer: { program: "air_fry", zone: "megazone", temperature: 180, minutes: 10 },
};

export function DeviceConverter({ recipeId, device, again = false, tested = false }: Props) {
  const label = DEVICES.find((d) => d.value === device)?.short ?? device;
  const [variant, setVariant] = useState<Variant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);
  // Zählt hoch, wenn sich die Schrittliste verschiebt (Entfernen, neu umrechnen) → Felder starten neu
  const [version, setVersion] = useState(0);
  const [converting, startConvert] = useTransition();
  const [saving, startSave] = useTransition();

  function convert() {
    setError(null);
    startConvert(async () => {
      const result = await convertRecipe(recipeId, device);
      if (result.ok) {
        setVariant(result.variant);
        setVersion((v) => v + 1);
      } else setError(result.error);
    });
  }

  function updateStep(index: number, step: VariantStep) {
    setVariant((v) => v && { ...v, steps: v.steps.map((s, i) => (i === index ? step : s)) });
  }

  const checks = variant?.steps.map((s) => checkStep(device, s.settings)) ?? [];
  const hasErrors = checks.some((c) => c.errors.length > 0) || !!variant?.steps.some((s) => !s.text.trim());
  const needsConfirm = tested && !replace;

  function save() {
    if (!variant || hasErrors || needsConfirm) return;
    setError(null);
    startSave(async () => {
      const result = await saveVariant(recipeId, device, variant, replace);
      if (result?.message) setError(result.message);
    });
  }

  if (!variant) {
    return (
      <div className="space-y-2">
        <Button type="button" variant={again ? "ghost" : "outline"} size="sm" disabled={converting} onClick={convert}>
          {again ? <RefreshCw aria-hidden /> : <Sparkles aria-hidden />}
          {converting ? `KI rechnet für ${label} um …` : again ? `${label} neu umrechnen` : `Für ${label} umrechnen`}
        </Button>
        {converting && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Dauert meist 5–15 Sekunden.
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
            Vorschau: {label}-Version
          </p>
          <p className="text-sm text-muted-foreground">
            Von KI umgerechnet. Bitte prüfen und bei Bedarf ändern. Erst „Speichern“ legt die Version an, das Original bleibt unverändert.
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => setVariant(null)} aria-label="Vorschau verwerfen">
          <X />
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`hint-${device}`} className="text-base">
          Kurzhinweis
        </Label>
        <Input
          id={`hint-${device}`}
          value={variant.hint}
          maxLength={200}
          onChange={(e) => setVariant({ ...variant, hint: e.target.value })}
          placeholder={DEVICES.find((d) => d.value === device)?.hintPlaceholder}
        />
      </div>

      <ol className="space-y-4">
        {variant.steps.map((step, index) => (
          <li key={`${version}-${index}`} className="space-y-3 rounded-2xl border border-border bg-card p-4">
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
                disabled={variant.steps.length <= 1}
                onClick={() => {
                  setVariant({ ...variant, steps: variant.steps.filter((_, i) => i !== index) });
                  setVersion((v) => v + 1);
                }}
                aria-label={`Schritt ${index + 1} entfernen`}
                className="hover:text-destructive"
              >
                <Trash2 />
              </Button>
            </div>

            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={step.settings !== null}
                onChange={(e) => updateStep(index, { ...step, settings: e.target.checked ? DEFAULTS[device] : null })}
                className="size-5 accent-primary"
              />
              Mit {label}-Einstellung
            </label>

            {step.settings &&
              (device === "tm6" ? (
                <Tm6Fields
                  index={index}
                  settings={step.settings as Tm6Settings}
                  onChange={(s) => updateStep(index, { ...step, settings: s })}
                />
              ) : (
                <AirfryerFields
                  index={index}
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
        ))}
      </ol>

      {tested && (
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => setReplace(e.target.checked)}
            className="mt-0.5 size-5 accent-primary"
          />
          <span>
            <span className="font-semibold">Getestete Version ersetzen</span>
            <span className="block text-muted-foreground">Die neue Version gilt dann wieder als „von KI umgerechnet“.</span>
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
          {saving ? "Wird gespeichert …" : `${label}-Version speichern`}
        </Button>
        <Button type="button" variant="ghost" size="lg" disabled={saving || converting} onClick={convert}>
          <RefreshCw aria-hidden />
          {converting ? "Rechnet neu …" : "Nochmal umrechnen"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children, className }: { label: string; htmlFor: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={htmlFor} className="text-sm text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Tm6Fields({ index, settings, onChange }: { index: number; settings: Tm6Settings; onChange: (s: Tm6Settings) => void }) {
  // Zeit als Text ("1:30"), damit auch Sekunden bequem gehen; ungültige Eingabe bleibt sichtbar stehen
  const [timeText, setTimeText] = useState(settings.seconds === null ? "" : formatTm6Time(settings.seconds));
  const timeInvalid = timeText.trim() !== "" && parseTm6Time(timeText) === null;
  const temp = settings.varoma ? "varoma" : settings.temperature === null ? "" : String(settings.temperature);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="Zeit (Min:Sek)" htmlFor={`t-${index}`}>
        <Input
          id={`t-${index}`}
          value={timeText}
          inputMode="numeric"
          placeholder="z. B. 1:30"
          aria-invalid={timeInvalid}
          onChange={(e) => {
            setTimeText(e.target.value);
            const seconds = parseTm6Time(e.target.value);
            if (seconds !== null || e.target.value.trim() === "") onChange({ ...settings, seconds });
          }}
        />
      </Field>
      <Field label="Temperatur" htmlFor={`c-${index}`}>
        <select
          id={`c-${index}`}
          className={selectClass}
          value={temp}
          onChange={(e) => {
            const v = e.target.value;
            onChange({ ...settings, varoma: v === "varoma", temperature: v === "" || v === "varoma" ? null : Number(v) });
          }}
        >
          <option value="">ohne</option>
          {TM6_TEMPS.map((t) => (
            <option key={t} value={t}>
              {t} °C
            </option>
          ))}
          <option value="varoma">Varoma</option>
          {/* Wert von der KI außerhalb der Liste (z. B. 98 °C) trotzdem anzeigen */}
          {temp && temp !== "varoma" && !TM6_TEMPS.includes(temp) && <option value={temp}>{temp} °C</option>}
        </select>
      </Field>
      <Field label="Stufe" htmlFor={`s-${index}`}>
        <select
          id={`s-${index}`}
          className={selectClass}
          value={settings.speed ?? ""}
          onChange={(e) => onChange({ ...settings, speed: e.target.value || null })}
        >
          <option value="">ohne</option>
          {TM6_SPEEDS.map((s) => (
            <option key={s} value={s}>
              {speedOption(s)}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex min-h-11 cursor-pointer items-end gap-2 pb-2.5 text-sm font-medium">
        <input
          type="checkbox"
          checked={settings.reverse}
          onChange={(e) => onChange({ ...settings, reverse: e.target.checked })}
          className="size-5 accent-primary"
        />
        Linkslauf
      </label>
    </div>
  );
}

function AirfryerFields({
  index,
  settings,
  onChange,
}: {
  index: number;
  settings: AirfryerSettings;
  onChange: (s: AirfryerSettings) => void;
}) {
  const number = (value: string) => (value === "" ? NaN : Number(value));
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Field label="Programm" htmlFor={`p-${index}`}>
        <select
          id={`p-${index}`}
          className={selectClass}
          value={settings.program}
          onChange={(e) => onChange({ ...settings, program: e.target.value as AirfryerSettings["program"] })}
        >
          {AIRFRYER_PROGRAMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Zone" htmlFor={`z-${index}`}>
        <select
          id={`z-${index}`}
          className={selectClass}
          value={settings.zone}
          onChange={(e) => onChange({ ...settings, zone: e.target.value as AirfryerSettings["zone"] })}
        >
          {AIRFRYER_ZONES.map((z) => (
            <option key={z.value} value={z.value}>
              {z.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Temperatur (°C)" htmlFor={`c-${index}`}>
        <Input
          id={`c-${index}`}
          type="number"
          inputMode="numeric"
          step={5}
          value={Number.isNaN(settings.temperature) ? "" : settings.temperature}
          onChange={(e) => onChange({ ...settings, temperature: number(e.target.value) })}
        />
      </Field>
      <Field label="Minuten" htmlFor={`m-${index}`}>
        <Input
          id={`m-${index}`}
          type="number"
          inputMode="numeric"
          value={Number.isNaN(settings.minutes) ? "" : settings.minutes}
          onChange={(e) => onChange({ ...settings, minutes: number(e.target.value) })}
        />
      </Field>
    </div>
  );
}
