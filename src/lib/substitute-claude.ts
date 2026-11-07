// Ruft Claude für Ersatz-Vorschläge auf (Spec 06, nur auf dem Server). Allergene werden NICHT mitgeschickt.
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { CLAUDE_MODEL, NOT_CONFIGURED, TRY_AGAIN, claudeClient, claudeErrorMessage } from "./claude";
import { SUBSTITUTE_SYSTEM_PROMPT, substituteOutputSchema, substituteUserText, type SubstituteOutput } from "./substitute";

type RecipeText = Parameters<typeof substituteUserText>[0];

export async function suggestWithClaude(
  recipe: RecipeText,
  selected: string[],
): Promise<{ ok: true; output: SubstituteOutput } | { ok: false; error: string }> {
  const client = await claudeClient();
  if (!client) return { ok: false, error: NOT_CONFIGURED };
  try {
    const response = await client.beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // low: Küchenwissen, kein langes Nachdenken nötig (wie beim Import)
      output_config: { effort: "low", format: betaZodOutputFormat(substituteOutputSchema) },
      system: SUBSTITUTE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: substituteUserText(recipe, selected) }],
    });
    if (response.stop_reason === "refusal") return { ok: false, error: "Dafür gibt es leider keine Vorschläge." };
    if (!response.parsed_output) return { ok: false, error: `Die Antwort war unvollständig. ${TRY_AGAIN}` };
    return { ok: true, output: response.parsed_output as SubstituteOutput };
  } catch (error) {
    return { ok: false, error: claudeErrorMessage(error) };
  }
}
