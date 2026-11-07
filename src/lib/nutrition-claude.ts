// Ruft Claude für die BLS-Zuordnung auf (Spec 07, nur auf dem Server). Gesendet werden nur Zutatenzeilen und Kandidaten.
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { CLAUDE_MODEL, NOT_CONFIGURED, TRY_AGAIN, claudeClient, claudeErrorMessage } from "./claude";
import { MATCH_SYSTEM_PROMPT, matchOutputSchema, matchUserText, validMatches, type Match, type MatchItem } from "./nutrition-match";

export async function matchWithClaude(items: MatchItem[]): Promise<{ ok: true; matches: Match[] } | { ok: false; error: string }> {
  if (items.length === 0) return { ok: true, matches: [] };
  const client = await claudeClient();
  if (!client) return { ok: false, error: NOT_CONFIGURED };
  try {
    const response = await client.beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // low: Auswahl aus einer Liste und Küchenwissen, kein langes Nachdenken nötig
      output_config: { effort: "low", format: betaZodOutputFormat(matchOutputSchema) },
      system: MATCH_SYSTEM_PROMPT,
      messages: [{ role: "user", content: matchUserText(items) }],
    });
    if (response.stop_reason === "refusal") return { ok: false, error: "Dafür gibt es leider keine Vorschläge." };
    if (!response.parsed_output) return { ok: false, error: `Die Antwort war unvollständig. ${TRY_AGAIN}` };
    return { ok: true, matches: validMatches(response.parsed_output, items) };
  } catch (error) {
    return { ok: false, error: claudeErrorMessage(error) };
  }
}
