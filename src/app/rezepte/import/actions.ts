"use server";
// Import (Spec 04): Dateien prüfen, Claude lesen lassen, Entwurf zurückgeben. Speichert NICHTS –
// erst "Rezept speichern" im Formular legt das Rezept an (saveRecipe).
import { getCurrentUser } from "@/lib/auth";
import { checkImportFiles, countPdfPages, detectImportKind, toDraft, type ImportDraft } from "@/lib/import";
import { readRecipeWithClaude, type ImportFile } from "@/lib/import-claude";

export type ImportResult = { ok: true; draft: ImportDraft } | { ok: false; error: string };

export async function importRecipe(fd: FormData): Promise<ImportResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Du bist nicht mehr angemeldet. Bitte lade die Seite neu." };

  const uploads = fd.getAll("file").filter((v): v is File => v instanceof File && v.size > 0);
  // Größe zuerst prüfen, bevor große Dateien in den Speicher gelesen werden
  const sizeProblem = checkImportFiles(uploads.map((f) => ({ kind: "image", size: f.size })));
  if (sizeProblem && uploads.length > 0) return { ok: false, error: sizeProblem };

  const files: ImportFile[] = [];
  const infos: Parameters<typeof checkImportFiles>[0] = [];
  for (const upload of uploads) {
    const data = new Uint8Array(await upload.arrayBuffer());
    const type = detectImportKind(data.subarray(0, 16));
    infos.push({ kind: type?.kind ?? null, size: data.length, pages: type?.kind === "pdf" ? countPdfPages(data) : undefined });
    if (type) files.push({ data, type });
  }
  const problem = checkImportFiles(infos);
  if (problem) return { ok: false, error: problem };

  const result = await readRecipeWithClaude(files);
  if (!result.ok) return result;
  return toDraft(result.output);
}
