import type { PluginInput } from "@opencode-ai/plugin";

import { logger } from "../logger";
import { fallbackModel } from "../models";

const CREDIT_BALANCE_PATTERNS = [
  "credit balance is too low",
  "insufficient credits",
  "please go to plans & billing",
  "purchase credits",
];

const fallbackInProgress = new Set<string>();
const fallbackSessions = new Set<string>();
const lastFallbackTime = new Map<string, number>();
const COOLDOWN_MS = 30_000;

/** Returns true if the message contains a known Anthropic credit balance error pattern. */
export function isCreditBalanceError(message: string): boolean {
  const lower = message.toLowerCase();
  return CREDIT_BALANCE_PATTERNS.some((p) => lower.includes(p));
}

/** Returns true if the given session has previously fallen back to the free model. */
export function isSessionInFallback(sessionID: string): boolean {
  return fallbackSessions.has(sessionID);
}

/** Returns the fallback model split into providerID and modelID. */
export function getFallbackModelOverride(): { providerID: string; modelID: string } {
  const [providerID, modelID] = fallbackModel.split("/") as [string, string];
  return { providerID, modelID };
}

/**
 * Handles automatic fallback to free model when Anthropic credit balance is low.
 *
 * This function:
 * 1. Guards against re-entrant or rapid repeated fallbacks via in-progress set and cooldown
 * 2. Aborts the current retry loop for the session
 * 3. Finds and reverts to before the last user message
 * 4. Re-sends that message using the fallback model
 * 5. Shows a warning toast to the user
 */
export async function handleCreditBalanceFallback(
  client: PluginInput["client"],
  sessionID: string,
): Promise<void> {
  if (fallbackInProgress.has(sessionID)) return;

  const last = lastFallbackTime.get(sessionID);
  if (last && Date.now() - last < COOLDOWN_MS) return;

  fallbackInProgress.add(sessionID);
  lastFallbackTime.set(sessionID, Date.now());

  try {
    await client.session.abort({ path: { id: sessionID } });

    const { data: messages } = await client.session.messages({
      path: { id: sessionID },
    });
    if (!messages || messages.length === 0) {
      throw new Error("No messages found after abort");
    }

    const lastUserMsg = [...messages].reverse().find((m) => m.info.role === "user");
    if (!lastUserMsg) {
      throw new Error("No user message found to revert to");
    }

    const textPart = lastUserMsg.parts.find((p) => p.type === "text");
    if (!textPart || textPart.type !== "text") return;

    const messageID = lastUserMsg.info.id;
    const text = textPart.text;

    await client.session.revert({
      path: { id: sessionID },
      body: { messageID },
    });

    const [providerID, modelID] = fallbackModel.split("/") as [string, string];
    await client.session.prompt({
      path: { id: sessionID },
      body: {
        model: { providerID, modelID },
        parts: [{ type: "text", text }],
      },
    });

    fallbackSessions.add(sessionID);
    logger.info("Credit balance fallback triggered", { sessionID, fallbackModel });

    await client.tui.showToast({
      body: {
        message: "⚠️ Anthropic credit balance low — switched to Minimax M2.5 Free",
        variant: "warning",
      },
    });
  } catch (err) {
    logger.error("Credit balance fallback failed", { sessionID, err });
  } finally {
    fallbackInProgress.delete(sessionID);
  }
}
