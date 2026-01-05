import type { PluginInput } from "@opencode-ai/plugin";

import { recordToolResult, recordToolUse, recordUserMessage } from "./recorder";
import type { SessionInfo } from "./recorder";

const sessionInfoCache = new Map<string, SessionInfo>();

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
      input: { sessionID: string },
      output: { message: unknown; parts: unknown[] },
    ) => {
      const session = await getSessionInfo(ctx, input.sessionID);
      await recordUserMessage(session, output.message as any, output.parts as any);
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
  };
}
