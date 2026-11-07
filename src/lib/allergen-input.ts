// Prüft das Formular "Allergen hinzufügen" (Profilseite), bevor etwas in D1 kommt.
import { z } from "zod";
import { ingredientKey, type AllergenMode } from "./allergens";

export type AllergenInput = { name: string; synonyms: string[]; mode: AllergenMode };
export type AllergenFieldErrors = Partial<Record<keyof AllergenInput, string>>;

const MAX_SYNONYMS = 30;
// Begriff muss nach dem Vereinfachen noch Buchstaben/Ziffern haben, sonst findet er nie etwas
const term = (error: string) =>
  z
    .string()
    .trim()
    .min(1, { error })
    .max(60, { error: "Ein Begriff darf höchstens 60 Zeichen haben." })
    .refine((s) => ingredientKey(s) !== "", { error });

const schema = z.object({
  name: term("Bitte gib an, was du nicht verträgst."),
  synonyms: z.array(term("Synonyme bitte mit Buchstaben.")).max(MAX_SYNONYMS, { error: `Höchstens ${MAX_SYNONYMS} Synonyme.` }),
  mode: z.enum(["always", "raw_only"], { error: "Bitte wähle „immer“ oder „nur roh“." }),
});

export function parseAllergenForm(fd: FormData): { success: true; data: AllergenInput } | { success: false; fieldErrors: AllergenFieldErrors } {
  const name = String(fd.get("name") ?? "");
  // Komma-Liste -> Begriffe; leere, doppelte und der Name selbst fallen weg
  const seen = new Set([ingredientKey(name)]);
  const synonyms = String(fd.get("synonyms") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => {
      const key = ingredientKey(s);
      if (s === "" || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const result = schema.safeParse({ name, synonyms, mode: fd.get("mode") ?? "always" });
  if (!result.success) {
    const fieldErrors: AllergenFieldErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof AllergenInput;
      fieldErrors[field] ??= issue.message;
    }
    return { success: false, fieldErrors };
  }
  return { success: true, data: result.data };
}
