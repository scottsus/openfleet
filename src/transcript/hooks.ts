import { existsSync, readFileSync } from "fs";
import path from "path";

import type { PluginInput } from "@opencode-ai/plugin";
import type { Event } from "@opencode-ai/sdk";

import {
  getFallbackModelOverride,
  handleCreditBalanceFallback,
  isCreditBalanceError,
  isSessionInFallback,
} from "../lib/fallback";
import { logger } from "../logger";
import { recordToolResult, recordToolUse, recordUserMessage } from "./recorder";
import type { SessionInfo } from "./recorder";

const sessionInfoCache = new Map<string, SessionInfo>();
const sessionAgentMap = new Map<string, string>();

const WORKSPACE_DIR = process.env.WORKSPACE_DIR ?? process.cwd();
const AGENT_OVERRIDE_DIR = path.join(WORKSPACE_DIR, ".opencode", "agents");

async function getSessionInfo(ctx: PluginInput, sessionID: string): Promise<SessionInfo> {
  const cached = sessionInfoCache.get(sessionID);
  if (cached) return cached;

  try {
    const { data: session } = await ctx.client.session.get({
      path: { id: sessionID },
      query: { directory: ctx.directory },
    });

    const info: SessionInfo = {
      sessionID,
      parentID: session?.parentID,
    };

    sessionInfoCache.set(sessionID, info);
    return info;
  } catch {
    const info: SessionInfo = { sessionID };
    sessionInfoCache.set(sessionID, info);
    return info;
  }
}

export function createTranscriptHooks(ctx: PluginInput) {
  return {
    "chat.message": async (
      input: { sessionID: string; agent?: string },
      output: { message: unknown; parts: unknown[] },
    ) => {
      if (input.agent) {
        sessionAgentMap.set(input.sessionID, input.agent);
      }
      const session = await getSessionInfo(ctx, input.sessionID);
      await recordUserMessage(session, output.message as any, output.parts as any);
    },

    "chat.model": async (
      input: { sessionID: string; agent: string; model: { providerID: string; modelID: string } },
      output: { model: { providerID: string; modelID: string } },
    ) => {
      if (isSessionInFallback(input.sessionID)) {
        output.model = getFallbackModelOverride();
      }
    },

    "tool.execute.before": async (
      input: { sessionID: string; tool: string; callID: string },
      output: { args: unknown },
    ) => {
      const session = await getSessionInfo(ctx, input.sessionID);
      await recordToolUse(session, input.tool, input.callID, output.args);
    },

    "tool.execute.after": async (
      input: { sessionID: string; tool: string; callID: string },
      output: { title: string; output: string; metadata?: unknown },
    ) => {
      const session = await getSessionInfo(ctx, input.sessionID);
      await recordToolResult(session, input.tool, input.callID, output);
    },

    "experimental.chat.system.transform": (async (
      input: { sessionID?: string; model: unknown },
      output: { system: string[] },
    ) => {
      const agentName = input.sessionID ? sessionAgentMap.get(input.sessionID) : undefined;
      if (!agentName) return;

      const overridePath = path.join(AGENT_OVERRIDE_DIR, agentName, "system_prompt.md");
      if (!overridePath.startsWith(AGENT_OVERRIDE_DIR + path.sep)) return;
      if (!existsSync(overridePath)) return;

      try {
        const content = readFileSync(overridePath, "utf-8").trim();
        if (content) {
          output.system.push(content);
        }
      } catch (err) {
        logger.error("Failed to read agent system prompt override", {
          agentName,
          overridePath,
          err,
        });
      }
    }) as (input: {}, output: { system: string[] }) => Promise<void>,

    event: async ({ event }: { event: Event }) => {
      if (event.type === "session.status") {
        const { sessionID, status } = event.properties;
        if (status.type === "retry" && isCreditBalanceError(status.message)) {
          await handleCreditBalanceFallback(ctx.client, sessionID);
        }
      }

      if (event.type === "session.error") {
        const { sessionID, error } = event.properties;
        if (
          sessionID &&
          error &&
          "message" in error.data &&
          isCreditBalanceError(String(error.data.message))
        ) {
          await handleCreditBalanceFallback(ctx.client, sessionID);
        }
      }

      if (event.type === "message.updated") {
        const { info } = event.properties;
        if (info.role === "assistant" && info.error) {
          if (
            "message" in info.error.data &&
            isCreditBalanceError(String(info.error.data.message))
          ) {
            await handleCreditBalanceFallback(ctx.client, info.sessionID);
          }
        }
      }
    },
  };
}
