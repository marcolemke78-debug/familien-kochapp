// Ruft Claude für den Rezept-Import auf (nur auf dem Server). Modell und Kosten: guidelines.md ADR-003.
import type Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { CLAUDE_MODEL, NOT_CONFIGURED, TRY_AGAIN, claudeClient, claudeErrorMessage } from "./claude";
import { IMPORT_SYSTEM_PROMPT, importOutputSchema, type ImportKind, type ImportOutput } from "./import";

export type ImportFile = { data: Uint8Array; type: ImportKind };
export type ClaudeResult = { ok: true; output: ImportOutput } | { ok: false; error: string };

// Uint8Array -> Base64 in Stücken (String.fromCharCode mit Millionen Argumenten würde abstürzen)
function toBase64(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i += 0x8000) binary += String.fromCharCode(...data.subarray(i, i + 0x8000));
  return btoa(binary);
}

function contentBlock(file: ImportFile): Anthropic.Beta.BetaContentBlockParam {
  const data = toBase64(file.data);
  return file.type.kind === "pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
    : { type: "image", source: { type: "base64", media_type: file.type.mediaType, data } };
}

export async function readRecipeWithClaude(files: ImportFile[]): Promise<ClaudeResult> {
  const client = await claudeClient();
  if (!client) return { ok: false, error: NOT_CONFIGURED };
  try {
    const response = await client.beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // lehnt Opus ab, übernimmt automatisch ein Ersatzmodell
      output_config: { effort: "low", format: betaZodOutputFormat(importOutputSchema) },
      system: IMPORT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [...files.map(contentBlock), { type: "text", text: "Lies das Rezept aus diesen Dateien ab." }],
        },
      ],
    });

    if (response.stop_reason === "refusal") return { ok: false, error: "Diese Datei kann nicht gelesen werden. Bitte eine andere wählen." };
    if (response.stop_reason === "max_tokens") return { ok: false, error: "Das Rezept ist zu lang für einen Import. Bitte nur die Rezeptseite wählen." };
    if (!response.parsed_output) return { ok: false, error: `Die Antwort war unvollständig. ${TRY_AGAIN} Deine Datei bleibt ausgewählt.` };
    return { ok: true, output: response.parsed_output };
  } catch (error) {
    return { ok: false, error: claudeErrorMessage(error) };
  }
}
