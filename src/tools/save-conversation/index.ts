import { tool } from "@opencode-ai/plugin";
import type { PluginInput } from "@opencode-ai/plugin";

import { logger } from "../../logger";
import { defaultModel, parseModel } from "../../models";

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
      const { providerID, modelID } = parseModel(defaultModel);

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
