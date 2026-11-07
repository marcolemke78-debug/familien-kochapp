// Ruft Claude für Synonym-Vorschläge auf (Spec 06, nur auf dem Server).
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { CLAUDE_MODEL, NOT_CONFIGURED, TRY_AGAIN, claudeClient, claudeErrorMessage } from "./claude";
import { SYNONYM_SYSTEM_PROMPT, synonymOutputSchema } from "./synonyms";

export async function synonymsWithClaude(name: string): Promise<{ ok: true; synonyms: string[] } | { ok: false; error: string }> {
  const client = await claudeClient();
  if (!client) return { ok: false, error: NOT_CONFIGURED };
  try {
    const response = await client.beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // low: reines Küchenwissen
      output_config: { effort: "low", format: betaZodOutputFormat(synonymOutputSchema) },
      system: SYNONYM_SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Begriff: ${name}` }],
    });
    if (response.stop_reason === "refusal") return { ok: false, error: "Dafür gibt es leider keine Vorschläge." };
    if (!response.parsed_output) return { ok: false, error: `Die Antwort war unvollständig. ${TRY_AGAIN}` };
    return { ok: true, synonyms: response.parsed_output.synonyms };
  } catch (error) {
    return { ok: false, error: claudeErrorMessage(error) };
  }
}
