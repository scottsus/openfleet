import type { Plugin, PluginInput } from "@opencode-ai/plugin";

import { configureAgents } from "./agents";
import { createCompactionHook } from "./context";
import { sleep } from "./lib/utils";
import { logger } from "./logger";
import { createSaveConversationTool } from "./tools/save-conversation";
import { createTranscriptHooks } from "./transcript";
import { initializeDirectories } from "./utils/directory-init";
import { showSpinnerToast } from "./utils/toast";

const OpenfleetPlugin: Plugin = async (ctx) => {
  initializeDirectories();

  logger.info("Plugin loaded");
  const saveConversation = createSaveConversationTool(ctx);
  const transcriptHooks = createTranscriptHooks(ctx);
  const compactionHook = createCompactionHook(ctx);

  return {
    tool: {
      save_conversation: saveConversation,
    },

    config: async (config) => {
      configureAgents(config);
    },

    event: async ({ event }) => {
      if (event.type !== "session.created") return;

      const props = event.properties as { info?: { parentID?: string } } | undefined;
      if (props?.info?.parentID) return;

      setTimeout(async () => {
        await showFleetToast(ctx);
      }, 0);
    },

    ...transcriptHooks,
    ...compactionHook,
  };
};

async function showFleetToast(ctx: PluginInput): Promise<void> {
  const stopSpinner = showSpinnerToast(ctx, {
    title: "⛴️  Openfleet",
    message: "The Openfleet plugin is now at play.",
    variant: "info",
  });

  await sleep(5000);
  await stopSpinner();
}

export default OpenfleetPlugin;
