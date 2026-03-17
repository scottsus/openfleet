import { tool } from "@opencode-ai/plugin";
import type { PluginInput } from "@opencode-ai/plugin";
import type { SessionMessagesResponse } from "@opencode-ai/sdk";

import { logger } from "../../logger";

type SessionMessage = SessionMessagesResponse[number];

export function createSaveConversationTool(ctx: PluginInput) {
  return tool({
    description: `Compact the current context via summarization.

Use this tool:
- After completing a feature or major task
- When context is getting large
- At natural stopping points
`,
    args: {
      note: tool.schema.string().optional().describe("Optional note about what was accomplished"),
    },

    async execute(_args, context) {
      const { sessionID } = context;

      try {
        const { data: messages } = await ctx.client.session.messages({
          path: { id: sessionID },
          query: { directory: ctx.directory },
        });

        if (!messages || messages.length === 0) {
          return "No messages to save.";
        }

        const lastAssistant = [...messages]
          .reverse()
          .find(
            (m): m is SessionMessage & { info: { role: "assistant" } } =>
              m.info.role === "assistant",
          );

        const providerID = lastAssistant?.info.providerID ?? "anthropic";
        const modelID = lastAssistant?.info.modelID ?? "claude-sonnet-4";

        await ctx.client.session.summarize({
          path: { id: sessionID },
          body: { providerID, modelID },
          query: { directory: ctx.directory },
        });

        logger.info("Session compacted", { sessionID, providerID, modelID });

        return `✅ Context compacted successfully.`;
      } catch (error) {
        logger.error("Failed to compact session", error);
        return `❌ Failed to compact session: ${error}`;
      }
    },
  });
}
