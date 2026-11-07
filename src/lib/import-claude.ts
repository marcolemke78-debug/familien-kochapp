// Ruft Claude für den Rezept-Import auf (nur auf dem Server). Modell und Kosten: guidelines.md ADR-003.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { IMPORT_SYSTEM_PROMPT, importOutputSchema, type ImportKind, type ImportOutput } from "./import";

export type ImportFile = { data: Uint8Array; type: ImportKind };
export type ClaudeResult = { ok: true; output: ImportOutput } | { ok: false; error: string };

const TRY_AGAIN = "Bitte versuch es gleich noch einmal. Deine Datei bleibt ausgewählt.";

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
  const { env } = await getCloudflareContext({ async: true });
  // Secret aus `wrangler secret put` bzw. .dev.vars – steht nicht in den generierten Typen
  const apiKey = (env as { ANTHROPIC_API_KEY?: string }).ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "Der Import ist noch nicht eingerichtet (API-Schlüssel fehlt)." };

  const client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 1 });
  try {
    const response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
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
    if (!response.parsed_output) return { ok: false, error: `Die Antwort war unvollständig. ${TRY_AGAIN}` };
    return { ok: true, output: response.parsed_output };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
      return { ok: false, error: "Der API-Schlüssel für den Import ist ungültig. Bitte Marco Bescheid geben." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Gerade zu viele Anfragen oder das Monatsbudget ist aufgebraucht. Bitte später noch einmal." };
    }
    if (error instanceof Anthropic.APIConnectionTimeoutError) return { ok: false, error: `Das hat zu lange gedauert. ${TRY_AGAIN}` };
    if (error instanceof Anthropic.BadRequestError) {
      return { ok: false, error: "Die Datei konnte nicht verarbeitet werden, oder das Monatsbudget ist aufgebraucht." };
    }
    return { ok: false, error: `Der Import hat nicht geklappt. ${TRY_AGAIN}` };
  }
}
