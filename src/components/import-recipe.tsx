"use client";
// Import-Ablauf (Spec 04): 1. Dateien wählen  2. Claude liest  3. Entwurf im normalen Formular prüfen.
// Die gewählten Dateien bleiben bei Fehlern erhalten, damit man direkt erneut versuchen kann.
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, FileText, Sparkles, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RecipeForm } from "@/components/recipe-form";
import { importRecipe } from "@/app/rezepte/import/actions";
import type { ImportDraft } from "@/lib/import"; // nur der Typ: import.ts selbst ist Server-Code
import { checkOriginal, MAX_ORIGINAL_BYTES, resizeImage } from "@/lib/resize-image";
import { cn } from "@/lib/utils";

type Picked = { id: number; file: File; preview: string | null }; // preview nur bei Bildern

const pickerClass = cn(
  "inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-medium transition-colors duration-150 ease-out hover:bg-muted",
  "has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50",
);

function isPdf(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function ImportRecipe() {
  const [picked, setPicked] = useState<Picked[]>([]);
  const [ownPhoto, setOwnPhoto] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [reading, setReading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ clientId: string; values: ImportDraft } | null>(null);
  const nextId = useRef(0);

  // Vorschau-URLs beim Verlassen der Seite freigeben
  const pickedRef = useRef(picked);
  useEffect(() => {
    pickedRef.current = picked;
  }, [picked]);
  useEffect(() => () => pickedRef.current.forEach((p) => p.preview && URL.revokeObjectURL(p.preview)), []);

  // Sekundenzähler, damit man sieht, dass noch etwas passiert
  useEffect(() => {
    if (!reading) return;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [reading]);

  async function addFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(null);
    setPreparing(true);
    const added: Picked[] = [];
    try {
      for (const file of Array.from(list)) {
        if (isPdf(file)) {
          if (file.size > MAX_ORIGINAL_BYTES) throw new Error("Das PDF ist größer als 10 MB.");
          added.push({ id: nextId.current++, file, preview: null });
          continue;
        }
        const problem = checkOriginal(file);
        if (problem) throw new Error(problem);
        // Verkleinern spart Kosten: weniger Pixel = weniger Token (ADR-003)
        const resized = await resizeImage(file).catch(() => {
          throw new Error("Dieses Foto kann dein Browser nicht lesen. Bitte als JPEG speichern oder ein anderes wählen.");
        });
        added.push({ id: nextId.current++, file: resized, preview: URL.createObjectURL(resized) });
      }
      setPicked((p) => [...p, ...added]);
    } catch (e) {
      added.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
      setError(e instanceof Error ? e.message : "Die Datei konnte nicht geladen werden.");
    } finally {
      setPreparing(false);
    }
  }

  function removeFile(id: number) {
    setPicked((list) => {
      const gone = list.find((p) => p.id === id);
      if (gone?.preview) URL.revokeObjectURL(gone.preview);
      return list.filter((p) => p.id !== id);
    });
  }

  async function read() {
    if (reading || picked.length === 0) return;
    setError(null);
    setSeconds(0);
    setReading(true);
    try {
      const fd = new FormData();
      picked.forEach((p) => fd.append("file", p.file));
      const result = await importRecipe(fd);
      if (result.ok) {
        setDraft({ clientId: crypto.randomUUID(), values: result.draft });
        window.scrollTo({ top: 0 });
      } else {
        setError(result.error);
      }
    } catch {
      setError("Keine Verbindung zum Server. Bitte prüfe das Internet und versuch es noch einmal.");
    } finally {
      setReading(false);
    }
  }

  const images = picked.filter((p) => p.preview);
  const hasPdf = picked.some((p) => !p.preview);
  const canUsePhoto = picked.length === 1 && images.length === 1;

  if (draft) {
    const d = draft.values;
    return (
      <div className="space-y-6">
        <div className="space-y-3 rounded-[1.25rem] border border-primary/30 bg-linear-to-br from-primary/10 to-transparent p-5">
          <p className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="size-5 text-primary" aria-hidden />
            Entwurf aus deiner Datei
          </p>
          <p className="text-sm text-muted-foreground">
            Bitte alles kurz prüfen, besonders Mengen und Quelle. Erst „Rezept speichern“ legt das Rezept an.
          </p>
          <Button type="button" variant="ghost" size="sm" className="-ml-3" onClick={() => setDraft(null)}>
            <ArrowLeft aria-hidden />
            Zurück zur Datei
          </Button>
        </div>
        <RecipeForm
          key={draft.clientId}
          requireSource
          initialPhoto={canUsePhoto && ownPhoto ? images[0].file : undefined}
          values={{
            id: null,
            clientId: draft.clientId,
            title: d.title,
            description: d.description,
            servings: d.servings,
            prepMinutes: d.prepMinutes,
            sourceUrl: d.sourceUrl,
            sourceNote: d.sourceNote,
            tags: d.tags,
            // Geräteangaben aus dem Original: Status "original", nie "getestet"
            devices: d.devices.map((x) => ({ ...x, status: "original" })),
            ingredients: d.ingredients,
            steps: d.steps,
            photoKey: null,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-base text-muted-foreground">
        Foto, Screenshot oder PDF eines Rezepts wählen. Claude liest es aus und füllt das Formular vor. Bis zu 4 Fotos,
        wenn das Rezept über mehrere Seiten geht.
      </p>

      <div className="flex flex-wrap gap-2">
        <label className={pickerClass}>
          <Upload className="size-4" aria-hidden />
          Datei wählen
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            className="sr-only"
            disabled={reading || preparing}
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = ""; // dieselbe Datei erneut wählbar
            }}
          />
        </label>
        <label className={pickerClass}>
          <Camera className="size-4" aria-hidden />
          Foto aufnehmen
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            disabled={reading || preparing}
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {preparing && <p className="text-sm font-medium text-muted-foreground">Datei wird vorbereitet …</p>}

      {picked.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {picked.map((p, index) => (
            <li key={p.id} className="relative overflow-hidden rounded-2xl border border-border bg-muted">
              {p.preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- Vorschau aus dem Browser (blob:)
                <img src={p.preview} alt={`Gewählte Seite ${index + 1}`} className="aspect-[3/4] w-full object-cover" />
              ) : (
                <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 p-3 text-center text-sm text-muted-foreground">
                  <FileText className="size-8" aria-hidden />
                  <span className="line-clamp-2 break-all">{p.file.name}</span>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                size="icon"
                disabled={reading}
                onClick={() => removeFile(p.id)}
                aria-label={`Seite ${index + 1} entfernen`}
                className="absolute top-2 right-2 rounded-full shadow-float"
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {canUsePhoto && (
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 text-base transition-colors duration-150 ease-out hover:bg-muted/60">
          <input type="checkbox" checked={ownPhoto} onChange={(e) => setOwnPhoto(e.target.checked)} className="mt-1 size-5 accent-primary" />
          <span>
            <span className="font-semibold">Mein eigenes Foto vom Gericht</span>
            <span className="block text-sm text-muted-foreground">
              Dann wird es als Rezeptfoto übernommen. Fotos aus Büchern oder fremde Bilder bitte nicht.
            </span>
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {reading ? (
        <div className="space-y-3 rounded-[1.25rem] border border-border bg-card p-5" aria-live="polite">
          <p className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="size-5 animate-pulse text-primary" aria-hidden />
            Claude liest das Rezept … {seconds > 0 && <span className="font-normal text-muted-foreground tabular-nums">{seconds} s</span>}
          </p>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            {/* Wächst langsam auf ~90 %, weil die genaue Dauer unbekannt ist (meist 10–40 Sekunden) */}
            <div
              className="h-full rounded-full bg-linear-to-r from-primary to-brand-deep transition-[width] duration-1000 ease-out"
              style={{ width: `${Math.min(90, 8 + seconds * 3)}%` }}
            />
          </div>
          <p className="text-sm text-muted-foreground">Bitte die Seite offen lassen.</p>
        </div>
      ) : (
        <Button type="button" size="lg" className="w-full sm:w-auto" disabled={picked.length === 0 || preparing} onClick={() => void read()}>
          <Sparkles aria-hidden />
          {hasPdf ? "PDF auslesen" : picked.length > 1 ? "Fotos auslesen" : "Rezept auslesen"}
        </Button>
      )}
    </div>
  );
}
