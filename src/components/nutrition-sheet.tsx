"use client";
// Spec 07: Zutaten den BLS-Einträgen zuordnen. Claude schlägt vor, die Person prüft und übernimmt.
// Die Zuordnung gilt je Zutatenname für die ganze Familie.
import { useRef, useState, useTransition } from "react";
import { Calculator, Check, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { prepareNutrition, saveNutrition, searchBlsAction, type NutritionRow } from "@/app/rezepte/nutrition-actions";
import { MAX_GRAMS_PER_UNIT } from "@/lib/nutrition-match";
import { cn } from "@/lib/utils";

const SKIP = "__skip";

export function NutritionSheet({ recipeId, label }: { recipeId: number; label: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NutritionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [loading, startLoad] = useTransition();
  const [saving, startSave] = useTransition();
  const loadId = useRef(0); // verwirft Antworten, die erst nach dem Schließen ankommen

  function load() {
    setError(null);
    const id = ++loadId.current;
    startLoad(async () => {
      const result = await prepareNutrition(recipeId);
      if (id !== loadId.current) return;
      if (result.ok) {
        setRows(result.rows);
        setAiError(result.aiError);
      } else setError(result.error);
    });
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) load();
    else {
      loadId.current++;
      setRows(null);
      setAiError(null);
    }
  }

  function update(key: string, change: Partial<NutritionRow>) {
    setRows((list) => list?.map((r) => (r.key === key ? { ...r, ...change, saved: false } : r)) ?? null);
  }

  function save() {
    if (!rows) return;
    setError(null);
    const entries = rows
      .filter((r) => r.skip || r.code)
      .map((r) => ({
        key: r.key,
        code: r.skip ? null : r.code,
        skip: r.skip,
        grams: Object.fromEntries(Object.entries(r.grams).filter(([, g]) => g > 0)),
      }));
    if (entries.length === 0) return setError("Bitte ordne mindestens eine Zutat zu.");
    startSave(async () => {
      const result = await saveNutrition(recipeId, entries);
      if (result.message) setError(result.message);
      else onOpenChange(false);
    });
  }

  const openCount = rows?.filter((r) => !r.skip && (!r.code || r.units.some((u) => !(r.grams[u] > 0)))).length ?? 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger render={<Button variant="outline" className="w-full" />}>
        <Calculator aria-hidden />
        {label}
      </SheetTrigger>
      <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-xl">Nährwerte zuordnen</SheetTitle>
          <SheetDescription>
            Jede Zutat bekommt einen Eintrag aus dem Bundeslebensmittelschlüssel. Prüfe die Vorschläge und die Gramm je Einheit. Die Zuordnung gilt
            danach für alle Rezepte.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-6">
          {loading && (
            <p className="flex items-center gap-2 text-muted-foreground" role="status">
              <Sparkles className="size-4 animate-pulse" aria-hidden />
              Claude ordnet die Zutaten zu …
            </p>
          )}
          {aiError && (
            <p role="alert" className="rounded-2xl bg-muted p-3 text-sm">
              {aiError} Du kannst die Einträge selbst suchen.
            </p>
          )}

          {rows && (
            <ul className="space-y-3">
              {rows.map((row, index) => (
                <RowEditor key={row.key} id={`naehrwert-${index}`} row={row} onChange={(change) => update(row.key, change)} />
              ))}
            </ul>
          )}

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}

          {rows && (
            <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
              {openCount > 0 && <p className="mb-2 text-sm text-muted-foreground">Noch offen: {openCount}. Offene Zutaten zählen als „unvollständig“.</p>}
              <Button onClick={save} disabled={saving} className="w-full">
                {saving ? "Wird gespeichert …" : "Übernehmen"}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RowEditor({ id, row, onChange }: { id: string; row: NutritionRow; onChange: (change: Partial<NutritionRow>) => void }) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startSearch] = useTransition();
  const [noHits, setNoHits] = useState(false);
  const selectId = id;
  const done = row.skip || (!!row.code && row.units.every((u) => row.grams[u] > 0));

  function search() {
    setNoHits(false);
    startSearch(async () => {
      const hits = await searchBlsAction(query);
      setNoHits(hits.length === 0);
      if (hits.length === 0) return;
      // Treffer übernehmen, ersten gleich auswählen
      onChange({ options: hits, code: hits[0].code, skip: false });
      setSearching(false);
    });
  }

  return (
    <li className={cn("space-y-3 rounded-2xl border bg-card p-3", done ? "border-border" : "border-amber-500/50")}>
      <div className="flex items-start justify-between gap-2">
        <label htmlFor={selectId} className="font-medium">
          {row.line}
        </label>
        <span className={cn("shrink-0 text-xs font-semibold", done ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400")}>
          {row.saved ? (
            <span className="inline-flex items-center gap-1">
              <Check className="size-3.5" aria-hidden />
              gespeichert
            </span>
          ) : done ? (
            row.suggested ? "Vorschlag" : "bereit"
          ) : (
            "offen"
          )}
        </span>
      </div>

      <select
        id={selectId}
        value={row.skip ? SKIP : (row.code ?? "")}
        onChange={(e) => (e.target.value === SKIP ? onChange({ skip: true, code: null }) : onChange({ skip: false, code: e.target.value || null }))}
        className="h-12 w-full rounded-xl border border-input bg-card px-3 text-base transition-colors duration-150 ease-out outline-none hover:border-foreground/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        {!row.code && !row.skip && <option value="">Bitte wählen …</option>}
        {row.options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.name}
          </option>
        ))}
        <option value={SKIP}>Nicht mitrechnen (z. B. Wasser, Salz nach Geschmack)</option>
      </select>

      {!row.skip &&
        row.units.map((u) => (
          <div key={u} className="flex items-center gap-2">
            <label htmlFor={`${selectId}-${u || "stueck"}`} className="text-sm text-muted-foreground">
              1 {row.unitLabels[u]} =
            </label>
            <GramsInput
              id={`${selectId}-${u || "stueck"}`}
              value={row.grams[u]}
              onChange={(g) => {
                const grams = { ...row.grams };
                if (g === null) delete grams[u];
                else grams[u] = g;
                onChange({ grams });
              }}
            />
            <span className="text-sm text-muted-foreground">g</span>
          </div>
        ))}

      {searching ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            search();
          }}
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Im BLS suchen"
            aria-label={`Anderen Eintrag für ${row.line} suchen`}
            enterKeyHint="search"
            className="h-11"
            autoFocus
          />
          <Button type="submit" variant="secondary" disabled={pending || query.trim().length < 3} className="h-11">
            <Search aria-hidden />
            <span className="sr-only">Suchen</span>
          </Button>
        </form>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => setSearching(true)} className="-ml-2 min-h-11">
          <Search aria-hidden />
          Anderen Eintrag suchen
        </Button>
      )}
      {noHits && <p className="text-sm text-muted-foreground">Nichts gefunden. Versuch einen allgemeineren Begriff.</p>}
    </li>
  );
}

// Eigener Textzustand, damit "0,92" oder "0.5" Zeichen für Zeichen tippbar ist (Komma oder Punkt)
function GramsInput({ id, value, onChange }: { id: string; value: number | undefined; onChange: (grams: number | null) => void }) {
  const [text, setText] = useState(value ? String(value).replace(".", ",") : "");
  const parsed = Number(text.replace(",", "."));
  const valid = text.trim() !== "" && parsed > 0 && parsed <= MAX_GRAMS_PER_UNIT;
  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value.replace(",", "."));
        onChange(e.target.value.trim() !== "" && n > 0 && n <= MAX_GRAMS_PER_UNIT ? n : null);
      }}
      aria-invalid={!valid}
      className="h-11 w-24"
    />
  );
}
