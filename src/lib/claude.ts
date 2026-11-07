// Gemeinsame Claude-Anbindung für Import (Spec 04) und Umrechnung (Spec 05). Nur auf dem Server.
// Modell, Kosten und Budget: guidelines.md ADR-003.
import Anthropic from "@anthropic-ai/sdk";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export const CLAUDE_MODEL = "claude-opus-5-5";
export const TRY_AGAIN = "Bitte versuch es gleich noch einmal.";

// null = Schlüssel fehlt (z. B. lokal ohne .dev.vars)
export async function claudeClient(): Promise<Anthropic | null> {
  const { env } = await getCloudflareContext({ async: true });
  // Secret aus `wrangler secret put` bzw. .dev.vars – steht nicht in den generierten Typen
  const apiKey = (env as { ANTHROPIC_API_KEY?: string }).ANTHROPIC_API_KEY;
  return apiKey ? new Anthropic({ apiKey, timeout: 90_000, maxRetries: 1 }) : null;
}

export const NOT_CONFIGURED = "Die KI ist noch nicht eingerichtet (API-Schlüssel fehlt).";

// Verständliche Meldung je Fehlerart (typisierte SDK-Fehler, keine Textsuche)
export function claudeErrorMessage(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return "Der API-Schlüssel ist ungültig. Bitte Marco Bescheid geben.";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Gerade zu viele Anfragen oder das Monatsbudget ist aufgebraucht. Bitte später noch einmal.";
  }
  if (error instanceof Anthropic.APIConnectionTimeoutError) return `Das hat zu lange gedauert. ${TRY_AGAIN}`;
  if (error instanceof Anthropic.BadRequestError) {
    return "Die Anfrage konnte nicht verarbeitet werden, oder das Monatsbudget ist aufgebraucht.";
  }
  return `Die KI hat gerade nicht geantwortet. ${TRY_AGAIN}`;
}
