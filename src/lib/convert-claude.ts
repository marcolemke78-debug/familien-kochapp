// Ruft Claude für die Geräte-Umrechnung auf (Spec 05, nur auf dem Server).
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { CLAUDE_MODEL, NOT_CONFIGURED, TRY_AGAIN, claudeClient, claudeErrorMessage } from "./claude";
import { convertOutputSchema, convertSystemPrompt, convertUserText, toVariant, type ConvertOutput, type Variant } from "./convert";
import type { Device } from "./recipe-meta";

type RecipeText = Parameters<typeof convertUserText>[0];

export async function convertWithClaude(device: Device, recipe: RecipeText): Promise<{ ok: true; variant: Variant } | { ok: false; error: string }> {
  const client = await claudeClient();
  if (!client) return { ok: false, error: NOT_CONFIGURED };
  try {
    const response = await client.beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // medium statt low: Garzeiten und Temperaturen brauchen etwas mehr Nachdenken als Abschreiben
      output_config: { effort: "medium", format: betaZodOutputFormat(convertOutputSchema(device)) },
      system: convertSystemPrompt(device),
      messages: [{ role: "user", content: convertUserText(recipe) }],
    });
    if (response.stop_reason === "refusal") return { ok: false, error: "Dieses Rezept kann nicht umgerechnet werden." };
    if (!response.parsed_output) return { ok: false, error: `Die Antwort war unvollständig. ${TRY_AGAIN}` };
    return toVariant(response.parsed_output as ConvertOutput);
  } catch (error) {
    return { ok: false, error: claudeErrorMessage(error) };
  }
}
