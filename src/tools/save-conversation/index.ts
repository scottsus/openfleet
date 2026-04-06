import { tool } from "@opencode-ai/plugin";
import type { PluginInput } from "@opencode-ai/plugin";

import { logger } from "../../logger";

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
      const { sessionID, messageID } = context;

      const { data: messages } = await ctx.client.session.messages({
        path: { id: sessionID },
      });
      const currentMsg = messages?.find((m) => m.info.id === messageID);
      const info = currentMsg?.info;

      const providerID = info?.role === "assistant" ? info.providerID : info?.model?.providerID;
      const modelID = info?.role === "assistant" ? info.modelID : info?.model?.modelID;

      if (!providerID || !modelID) {
        logger.error("Cannot determine model for summarization", { sessionID, messageID });
        return "❌ Failed to determine model for context compaction.";
      }

      ctx.client.session
        .summarize({
          path: { id: sessionID },
          body: { providerID, modelID },
          query: { directory: ctx.directory },
        })
        .then(() => {
          logger.info("Session compacted", { sessionID, providerID, modelID });
        })
        .catch((error) => {
          logger.error("Failed to compact session", error);
        });

      return `✅ Context compaction initiated.`;
    },
  });
}
