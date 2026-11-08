// Ruft Claude für die Kombi-Planung TM6 + Heißluft auf (Spec 10, nur auf dem Server).
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { CLAUDE_MODEL, NOT_CONFIGURED, TRY_AGAIN, claudeClient, claudeErrorMessage } from "./claude";
import { convertUserText } from "./convert";
import { comboOutputSchema, comboSystemPrompt, toCombo, type Combo, type ComboOutput } from "./combo";

type RecipeText = Parameters<typeof convertUserText>[0];

export async function planComboWithClaude(recipe: RecipeText): Promise<{ ok: true; combo: Combo } | { ok: false; error: string }> {
  const client = await claudeClient();
  if (!client) return { ok: false, error: NOT_CONFIGURED };
  try {
    const response = await client.beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // medium wie bei Spec 05: zwei Geräte zeitlich abstimmen braucht etwas Nachdenken
      output_config: { effort: "medium", format: betaZodOutputFormat(comboOutputSchema) },
      system: comboSystemPrompt(),
      messages: [{ role: "user", content: convertUserText(recipe) }],
    });
    if (response.stop_reason === "refusal") return { ok: false, error: "Dieses Rezept kann nicht geplant werden." };
    if (!response.parsed_output) return { ok: false, error: `Die Antwort war unvollständig. ${TRY_AGAIN}` };
    return toCombo(response.parsed_output as ComboOutput);
  } catch (error) {
    return { ok: false, error: claudeErrorMessage(error) };
  }
}
