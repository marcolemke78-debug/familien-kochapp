"use client";
// Formular zum Anlegen und Bearbeiten. Auf dem Handy bedienbar: große Felder, Zeilen per Knopf verschieben,
// Enter legt eine neue Zutat an, mehrzeiliges Einfügen verteilt sich auf mehrere Zeilen.
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DeviceBadge } from "@/components/device-badge";
import { saveRecipe, type SaveState } from "@/app/rezepte/actions";
import { checkOriginal, resizeImage } from "@/lib/resize-image";
import { parseIngredientLine } from "@/lib/ingredients";
import { DEVICES, DEVICE_STATUS, MEALS, TRAITS, type Device, type DeviceStatus } from "@/lib/recipe-meta";
import { cn } from "@/lib/utils";

export type RecipeFormValues = {
  id: number | null; // null = neues Rezept
  clientId: string;
  title: string;
  description: string;
  servings: number;
  prepMinutes: number | null;
  sourceUrl: string;
  sourceNote: string;
  tags: string[];
  devices: { device: Device; status: DeviceStatus; hint: string | null }[];
  ingredients: string[]; // je Zeile z. B. "200 g Mehl"
  steps: string[];
  photoKey: string | null;
};

type Row = { id: number; text: string };

// Zeilen mit festen IDs, damit React beim Verschieben die richtigen Felder behält
function useRows(initial: string[], minRows: number) {
  const [rows, setRows] = useState<Row[]>(() => {
    const texts = [...initial];
    while (texts.length < minRows) texts.push("");
    return texts.map((text, id) => ({ id, text })); // Start-IDs = Position
  });
  // Neue Zeilen bekommen fortlaufende IDs hinter den Start-IDs (nur in Klick-Handlern benutzt)
  const nextId = useRef(Math.max(initial.length, minRows));
  const make = (text: string): Row => ({ id: nextId.current++, text });
  const [focusId, setFocusId] = useState<number | null>(null);

  return {
    rows,
    focusId,
    clearFocus: () => setFocusId(null),
    update: (id: number, text: string) => setRows((r) => r.map((row) => (row.id === id ? { ...row, text } : row))),
    // Neue Zeile(n) nach `afterId` einfügen (oder am Ende) und die erste davon fokussieren
    insert: (afterId: number | null, texts: string[] = [""]) => {
      const created = texts.map(make);
      setRows((r) => {
        const index = afterId === null ? r.length : r.findIndex((row) => row.id === afterId) + 1;
        return [...r.slice(0, index), ...created, ...r.slice(index)];
      });
      setFocusId(created[created.length - 1].id);
    },
    remove: (id: number) => setRows((r) => (r.length > 1 ? r.filter((row) => row.id !== id) : [{ ...r[0], text: "" }])),
    move: (id: number, delta: -1 | 1) =>
      setRows((r) => {
        const i = r.findIndex((row) => row.id === id);
        const j = i + delta;
        if (j < 0 || j >= r.length) return r;
        const copy = [...r];
        [copy[i], copy[j]] = [copy[j], copy[i]];
        return copy;
      }),
  };
}

type PhotoState = {
  file: File | null; // verkleinertes neues Foto
  preview: string | null;
  remove: boolean;
  busy: boolean;
  error: string | null;
};

type RecipeFormProps = {
  values: RecipeFormValues;
  initialPhoto?: File; // z. B. das eigene Foto aus dem Import
  requireSource?: boolean; // beim Import ist die Quelle Pflicht
};

export function RecipeForm({ values, initialPhoto, requireSource = false }: RecipeFormProps) {
  const action = useMemo(() => saveRecipe.bind(null, values.id), [values.id]);
  const [state, formAction, pending] = useActionState<SaveState, FormData>(action, {});
  const [, startTransition] = useTransition();
  const [clientError, setClientError] = useState<{ ingredients?: string; steps?: string }>({});

  const ingredients = useRows(values.ingredients, values.id === null ? 3 : 1);
  const steps = useRows(values.steps, values.id === null ? 2 : 1);
  const [activeDevices, setActiveDevices] = useState<Device[]>(values.devices.map((d) => d.device));
  const [photo, setPhoto] = useState<PhotoState>(() => ({
    file: initialPhoto ?? null,
    preview: initialPhoto ? URL.createObjectURL(initialPhoto) : values.photoKey ? `/fotos/${values.photoKey}` : null,
    remove: false,
    busy: false,
    error: null,
  }));

  // Client-Fehler nur einmischen, wenn sie gesetzt sind (sonst würden "undefined"-Werte Serverfehler überdecken)
  const errors = {
    ...state.fieldErrors,
    ...(clientError.ingredients && { ingredients: clientError.ingredients }),
    ...(clientError.steps && { steps: clientError.steps }),
  };
  const busy = pending || photo.busy;

  // Vorschau-URLs wieder freigeben, sonst bleibt Speicher belegt
  useEffect(() => {
    const url = photo.preview;
    return () => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [photo.preview]);

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    const problem = checkOriginal(file);
    if (problem) return setPhoto((p) => ({ ...p, error: problem }));
    setPhoto((p) => ({ ...p, busy: true, error: null }));
    try {
      const resized = await resizeImage(file);
      setPhoto({ file: resized, preview: URL.createObjectURL(resized), remove: false, busy: false, error: null });
    } catch {
      setPhoto((p) => ({
        ...p,
        busy: false,
        error: "Dieses Foto kann dein Browser nicht lesen. Bitte als JPEG speichern oder ein anderes wählen.",
      }));
    }
  }

  // Erst ein frisch gewähltes Foto verwerfen (zurück zum gespeicherten), sonst das gespeicherte entfernen
  function discardPhoto() {
    setPhoto((p) =>
      p.file
        ? { ...p, file: null, preview: values.photoKey ? `/fotos/${values.photoKey}` : null, error: null }
        : { ...p, remove: true, error: null },
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return; // Doppelklick: zweites Absenden ignorieren

    // Nur Überschriften wie "Für den Teig:" zählen nicht als Zutat
    const hasIngredient = ingredients.rows.some((r) => r.text.trim() && !parseIngredientLine(r.text).heading);
    const missing = {
      ingredients: hasIngredient ? undefined : "Bitte trage mindestens eine Zutat ein.",
      steps: steps.rows.some((r) => r.text.trim()) ? undefined : "Bitte trage mindestens einen Schritt ein.",
    };
    setClientError(missing);
    if (missing.ingredients || missing.steps) {
      document.getElementById(missing.ingredients ? "zutaten-titel" : "schritte-titel")?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    const fd = new FormData(event.currentTarget);
    if (photo.file) fd.set("photo", photo.file);
    if (photo.remove) fd.set("removePhoto", "1");
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10 pb-4">
      <input type="hidden" name="clientId" value={values.clientId} />

      {/* Foto */}
      <section className="space-y-3">
        <div className="relative overflow-hidden rounded-[1.25rem] border border-dashed border-input bg-muted">
          {photo.preview && !photo.remove ? (
            // eslint-disable-next-line @next/next/no-img-element -- Vorschau aus dem Browser (blob:) oder geschützte Route
            <img src={photo.preview} alt="Vorschau des Rezeptfotos" className="aspect-[4/3] w-full object-cover sm:aspect-[16/9]" />
          ) : (
            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 text-muted-foreground sm:aspect-[16/9]">
              <ImagePlus className="size-10" aria-hidden />
              <span className="text-base font-medium">Noch kein Foto</span>
            </div>
          )}
          {photo.busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-base font-medium backdrop-blur-sm">
              Foto wird verkleinert …
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <label
            className={cn(
              "inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium transition-colors duration-150 ease-out hover:bg-muted",
              "has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50",
            )}
          >
            <ImagePlus className="size-4" aria-hidden />
            {photo.preview && !photo.remove ? "Anderes Foto wählen" : "Foto wählen"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="sr-only"
              onChange={(e) => {
                void choosePhoto(e.target.files?.[0]);
                e.target.value = ""; // dasselbe Foto erneut wählbar
              }}
            />
          </label>
          {photo.preview && !photo.remove && (
            <Button type="button" variant="ghost" size="sm" onClick={discardPhoto}>
              <X aria-hidden />
              {photo.file && values.photoKey ? "Neues Foto verwerfen" : "Foto entfernen"}
            </Button>
          )}
        </div>
        <FieldError message={photo.error ?? errors.photo} />
      </section>

      {/* Grunddaten */}
      <section className="space-y-5">
        <Field label="Titel" htmlFor="title" error={errors.title}>
          <Input id="title" name="title" required maxLength={120} defaultValue={values.title} aria-invalid={!!errors.title} placeholder="z. B. Gemüsepfanne mit Reis" />
        </Field>
        <Field label="Kurzbeschreibung (freiwillig)" htmlFor="description" error={errors.description}>
          <Textarea id="description" name="description" maxLength={2000} defaultValue={values.description} rows={2} aria-invalid={!!errors.description} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Portionen" htmlFor="servings" error={errors.servings}>
            <Input id="servings" name="servings" type="number" inputMode="numeric" min={1} max={50} required defaultValue={values.servings} aria-invalid={!!errors.servings} />
          </Field>
          <Field label="Zeit in Minuten" htmlFor="prepMinutes" error={errors.prepMinutes}>
            <Input id="prepMinutes" name="prepMinutes" type="number" inputMode="numeric" min={1} max={1440} defaultValue={values.prepMinutes ?? ""} aria-invalid={!!errors.prepMinutes} placeholder="z. B. 30" />
          </Field>
        </div>
      </section>

      {/* Kategorien */}
      <fieldset className="space-y-4">
        <legend className="mb-3 text-xl font-semibold tracking-tight">Wann passt es?</legend>
        <ChipGroup name="tag" options={MEALS} selected={values.tags} />
        <p className="text-sm font-medium text-muted-foreground">Merkmale</p>
        <ChipGroup name="tag" options={TRAITS} selected={values.tags} />
        <FieldError message={errors.tags} />
      </fieldset>

      {/* Geräte */}
      <fieldset className="space-y-3">
        <legend className="mb-3 text-xl font-semibold tracking-tight">Geht das mit …</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {DEVICES.map((device) => {
            const active = activeDevices.includes(device.value);
            const existing = values.devices.find((d) => d.device === device.value);
            return (
              <div
                key={device.value}
                className={cn(
                  "rounded-[1.25rem] border bg-card p-4 transition-colors duration-150 ease-out",
                  active ? "border-primary/60 ring-1 ring-primary/30" : "border-border",
                )}
              >
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base font-semibold">
                  <input
                    type="checkbox"
                    name="device"
                    value={device.value}
                    checked={active}
                    onChange={(e) =>
                      setActiveDevices((list) =>
                        e.target.checked ? [...list, device.value] : list.filter((d) => d !== device.value),
                      )
                    }
                    className="size-5 accent-primary"
                  />
                  {device.label}
                </label>
                {active && (
                  <div className="mt-3 space-y-2">
                    {existing && <DeviceBadge device={device.value} status={existing.status} showStatus className="shadow-none" />}
                    <Label htmlFor={`hint_${device.value}`} className="sr-only">
                      Hinweis für {device.label}
                    </Label>
                    <Input
                      id={`hint_${device.value}`}
                      name={`hint_${device.value}`}
                      maxLength={200}
                      defaultValue={existing?.hint ?? ""}
                      placeholder={device.hintPlaceholder}
                    />
                    {!existing && (
                      <p className="text-sm text-muted-foreground">Wird als „{DEVICE_STATUS.original}“ gespeichert.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <FieldError message={errors.devices} />
      </fieldset>

      {/* Zutaten */}
      <section className="space-y-3">
        <div className="space-y-1">
          <h2 id="zutaten-titel" className="text-xl font-semibold tracking-tight">Zutaten</h2>
          <p className="text-sm text-muted-foreground">
            Eine Zutat pro Zeile, z. B. „200 g Mehl“ oder „1 Prise Salz“. Enter legt eine neue Zeile an. Gruppen
            wie „Für die Soße:“ mit Doppelpunkt am Ende werden zur Zwischenüberschrift.
          </p>
        </div>
        <ol className="space-y-2">
          {ingredients.rows.map((row, index) => (
            <li key={row.id} className="flex items-center gap-2">
              <Input
                name="ingredient"
                value={row.text}
                maxLength={200}
                aria-label={`Zutat ${index + 1}`}
                aria-invalid={!!errors.ingredients}
                className={cn(parseIngredientLine(row.text).heading && "font-semibold")}
                placeholder={index === 0 ? "z. B. 200 g Mehl" : undefined}
                ref={(el) => {
                  if (el && row.id === ingredients.focusId) {
                    el.focus();
                    ingredients.clearFocus();
                  }
                }}
                onChange={(e) => ingredients.update(row.id, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    ingredients.insert(row.id);
                  }
                }}
                onPaste={(e) => {
                  // Nur in leere Zeilen verteilen, damit schon Getipptes nicht überschrieben wird
                  if (row.text.trim()) return;
                  const lines = e.clipboardData.getData("text").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                  if (lines.length < 2) return;
                  e.preventDefault();
                  ingredients.update(row.id, lines[0]);
                  ingredients.insert(row.id, lines.slice(1));
                }}
              />
              <RowButtons
                label={`Zutat ${index + 1}`}
                isFirst={index === 0}
                isLast={index === ingredients.rows.length - 1}
                onUp={() => ingredients.move(row.id, -1)}
                onDown={() => ingredients.move(row.id, 1)}
                onRemove={() => ingredients.remove(row.id)}
              />
            </li>
          ))}
        </ol>
        <Button type="button" variant="secondary" size="sm" onClick={() => ingredients.insert(null)}>
          <Plus aria-hidden />
          Zutat hinzufügen
        </Button>
        <FieldError message={errors.ingredients} />
      </section>

      {/* Schritte */}
      <section className="space-y-3">
        <h2 id="schritte-titel" className="text-xl font-semibold tracking-tight">Zubereitung</h2>
        <ol className="space-y-3">
          {steps.rows.map((row, index) => (
            <li key={row.id} className="flex items-start gap-2">
              <span
                aria-hidden
                className="mt-2 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold"
              >
                {index + 1}
              </span>
              <Textarea
                name="step"
                value={row.text}
                maxLength={2000}
                rows={3}
                aria-label={`Schritt ${index + 1}`}
                aria-invalid={!!errors.steps}
                placeholder={index === 0 ? "z. B. Gemüse waschen und klein schneiden." : undefined}
                ref={(el) => {
                  if (el && row.id === steps.focusId) {
                    el.focus();
                    steps.clearFocus();
                  }
                }}
                onChange={(e) => steps.update(row.id, e.target.value)}
              />
              <RowButtons
                vertical
                label={`Schritt ${index + 1}`}
                isFirst={index === 0}
                isLast={index === steps.rows.length - 1}
                onUp={() => steps.move(row.id, -1)}
                onDown={() => steps.move(row.id, 1)}
                onRemove={() => steps.remove(row.id)}
              />
            </li>
          ))}
        </ol>
        <Button type="button" variant="secondary" size="sm" onClick={() => steps.insert(null)}>
          <Plus aria-hidden />
          Schritt hinzufügen
        </Button>
        <FieldError message={errors.steps} />
      </section>

      {/* Quelle */}
      <Field label={requireSource ? "Quelle" : "Quelle (freiwillig)"} htmlFor="sourceNote" error={errors.sourceNote}>
        <Input
          id="sourceNote"
          name="sourceNote"
          required={requireSource}
          maxLength={200}
          defaultValue={values.sourceNote}
          aria-invalid={!!errors.sourceNote}
          placeholder="z. B. Buch Familienküche, S. 42"
        />
        {requireSource && <p className="text-sm text-muted-foreground">Woher stammt das Rezept? Buch, Zeitschrift, Sendung oder Website.</p>}
      </Field>
      <Field label="Link (freiwillig)" htmlFor="sourceUrl" error={errors.sourceUrl}>
        <Input id="sourceUrl" name="sourceUrl" type="url" inputMode="url" maxLength={500} defaultValue={values.sourceUrl} aria-invalid={!!errors.sourceUrl} placeholder="https://…" />
        <p className="text-sm text-muted-foreground">Bei Cookidoo nur den Link eintragen, nicht den Rezepttext abschreiben.</p>
      </Field>

      {/* Speichern: auf dem Handy unten angeheftet */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-background/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:mx-0 sm:rounded-[1.25rem] sm:border sm:px-4">
        {state.message && (
          <p role="alert" className="mb-2 text-sm font-medium text-destructive">
            {state.message}
          </p>
        )}
        <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">
          {pending ? "Wird gespeichert …" : values.id === null ? "Rezept speichern" : "Änderungen speichern"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, error, children }: { label: string; htmlFor: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-base">
        {label}
      </Label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

function FieldError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

function ChipGroup({ name, options, selected }: { name: string; options: readonly { value: string; label: string }[]; selected: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label key={option.value} className="cursor-pointer">
          <input type="checkbox" name={name} value={option.value} defaultChecked={selected.includes(option.value)} className="peer sr-only" />
          <span className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-base font-medium transition-all duration-150 ease-out select-none peer-checked:border-transparent peer-checked:bg-linear-to-r peer-checked:from-primary peer-checked:to-brand-deep peer-checked:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:border-foreground/40 active:scale-[0.97]">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}

type RowButtonsProps = {
  label: string;
  isFirst: boolean;
  isLast: boolean;
  vertical?: boolean;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
};

function RowButtons({ label, isFirst, isLast, vertical, onUp, onDown, onRemove }: RowButtonsProps) {
  return (
    <div className={cn("flex shrink-0", vertical ? "flex-col" : "flex-row")}>
      <Button type="button" variant="ghost" size="icon" disabled={isFirst} onClick={onUp} aria-label={`${label} nach oben`}>
        <ChevronUp />
      </Button>
      <Button type="button" variant="ghost" size="icon" disabled={isLast} onClick={onDown} aria-label={`${label} nach unten`}>
        <ChevronDown />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={`${label} entfernen`} className="hover:text-destructive">
        <Trash2 />
      </Button>
    </div>
  );
}
