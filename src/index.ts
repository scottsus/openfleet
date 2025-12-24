import type { Plugin, PluginInput } from "@opencode-ai/plugin";

import { configureAgents } from "./agents";
import { sleep } from "./lib/utils";
import { logger } from "./logger";
import { createSaveConversationTool } from "./tools/save-conversation";
import { initializeDirectories } from "./utils/directory-init";
import { showSpinnerToast } from "./utils/toast";

const OpenfleetPlugin: Plugin = async (ctx) => {
  logger.info("Plugin loaded");

  initializeDirectories();
  const saveConversation = createSaveConversationTool(ctx);

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
  };
};

async function showFleetToast(ctx: PluginInput): Promise<void> {
  const stopSpinner = showSpinnerToast(ctx, {
    title: "⛴️  Openfleet",
    message: "Admiral Kunkka is now steering opencode.",
    variant: "info",
  });

  await sleep(5000);
  await stopSpinner();
}

export default OpenfleetPlugin;
