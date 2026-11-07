// Prüft das Rezept-Formular, bevor etwas in die Datenbank kommt (zod).
// Wird von der Server Action benutzt. Der Browser prüft vorher zusätzlich mit `required`.
import { z } from "zod";
import { parseIngredientLine, type Ingredient } from "./ingredients";
import { TAG_VALUES, DEVICES, type Device, type Tag } from "./recipe-meta";

export type RecipeInput = {
  clientId: string;
  title: string;
  description: string | null;
  servings: number;
  prepMinutes: number | null;
  sourceUrl: string | null;
  sourceNote: string | null; // freie Quelle, z. B. "Buch Familienküche, S. 42"
  tags: Tag[];
  devices: { device: Device; hint: string | null }[];
  ingredients: Ingredient[];
  steps: string[];
};

export type FieldErrors = Partial<Record<keyof RecipeInput, string>>;

const DEVICE_VALUES = DEVICES.map((d) => d.value) as [Device, ...Device[]];

// Leere Eingabe -> undefined, damit .optional()/.default() greifen
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const optionalText = (max: number, error: string) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max, { error }).optional());

const schema = z.object({
  clientId: z.uuid({ error: "Formular ungültig, bitte Seite neu laden." }),
  title: z
    .string({ error: "Bitte gib einen Titel ein." })
    .trim()
    .min(1, { error: "Bitte gib einen Titel ein." })
    .max(120, { error: "Der Titel darf höchstens 120 Zeichen haben." }),
  description: optionalText(2000, "Die Beschreibung darf höchstens 2000 Zeichen haben."),
  servings: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: "Portionen bitte als Zahl." })
      .int({ error: "Portionen bitte als ganze Zahl." })
      .min(1, { error: "Mindestens 1 Portion." })
      .max(50, { error: "Höchstens 50 Portionen." })
      .default(4),
  ),
  prepMinutes: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: "Zeit bitte als Zahl in Minuten." })
      .int({ error: "Zeit bitte als ganze Minuten." })
      .min(1, { error: "Zeit bitte als positive Zahl." })
      .max(1440, { error: "Höchstens 1440 Minuten (24 Stunden)." })
      .optional(),
  ),
  sourceUrl: z.preprocess(
    blankToUndefined,
    z
      .url({ protocol: /^https?$/, error: "Bitte einen Link mit https:// eingeben." })
      .max(500, { error: "Der Link ist zu lang." })
      .optional(),
  ),
  sourceNote: optionalText(200, "Die Quelle darf höchstens 200 Zeichen haben."),
  tags: z.array(z.enum(TAG_VALUES as [Tag, ...Tag[]], { error: "Unbekannte Kategorie." })),
  devices: z.array(z.enum(DEVICE_VALUES, { error: "Unbekanntes Gerät." })),
  hints: z.record(z.string(), z.string().trim().max(200, { error: "Der Geräte-Hinweis ist zu lang." })),
  ingredients: z
    .array(z.string().trim().max(200, { error: "Eine Zutat darf höchstens 200 Zeichen haben." }))
    .max(80, { error: "Höchstens 80 Zutaten." })
    // Nur Überschriften ("Für den Teig:") zählen nicht als Zutat
    .refine((lines) => lines.some((line) => !parseIngredientLine(line).heading), {
      error: "Bitte trage mindestens eine Zutat ein.",
    }),
  steps: z
    .array(z.string().trim().max(2000, { error: "Ein Schritt darf höchstens 2000 Zeichen haben." }))
    .min(1, { error: "Bitte trage mindestens einen Schritt ein." })
    .max(50, { error: "Höchstens 50 Schritte." }),
});

// "/rezepte/12" -> 12, alles andere ("abc", "0", "1e3") -> null
export function parseRecipeId(raw: string): number | null {
  return /^[1-9]\d{0,9}$/.test(raw) ? Number(raw) : null;
}

function strings(fd: FormData, name: string): string[] {
  return fd.getAll(name).filter((v): v is string => typeof v === "string");
}

function nonEmpty(values: string[]): string[] {
  return values.map((v) => v.trim()).filter(Boolean);
}

export function parseRecipeForm(
  fd: FormData,
): { success: true; data: RecipeInput } | { success: false; fieldErrors: FieldErrors } {
  const devices = [...new Set(strings(fd, "device"))];
  const result = schema.safeParse({
    clientId: fd.get("clientId"),
    title: fd.get("title"),
    description: fd.get("description") ?? undefined,
    servings: fd.get("servings") ?? undefined,
    prepMinutes: fd.get("prepMinutes") ?? undefined,
    sourceUrl: fd.get("sourceUrl") ?? undefined,
    sourceNote: fd.get("sourceNote") ?? undefined,
    tags: [...new Set(strings(fd, "tag"))],
    devices,
    hints: Object.fromEntries(devices.map((d) => [d, String(fd.get(`hint_${d}`) ?? "")])),
    ingredients: nonEmpty(strings(fd, "ingredient")),
    steps: nonEmpty(strings(fd, "step")),
  });

  if (!result.success) {
    // Pro Feld nur die erste Meldung zeigen. Geräte-Hinweise zählen zum Feld "devices".
    const fieldErrors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const top = issue.path[0] === "hints" ? "devices" : (issue.path[0] as keyof RecipeInput);
      fieldErrors[top] ??= issue.message;
    }
    return { success: false, fieldErrors };
  }

  const d = result.data;
  return {
    success: true,
    data: {
      clientId: d.clientId,
      title: d.title,
      description: d.description ?? null,
      servings: d.servings,
      prepMinutes: d.prepMinutes ?? null,
      sourceUrl: d.sourceUrl ?? null,
      sourceNote: d.sourceNote ?? null,
      tags: d.tags,
      devices: d.devices.map((device) => ({ device, hint: d.hints[device] || null })),
      ingredients: d.ingredients.map(parseIngredientLine),
      steps: d.steps,
    },
  };
}
