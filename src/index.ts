import type { Plugin, PluginInput } from "@opencode-ai/plugin";

import { configureAgents } from "./agents";
import { sleep } from "./lib/utils";
import { logger } from "./logger";
import { createSaveConversationTool } from "./tools/save-conversation";
import { createTranscriptHooks } from "./transcript";
import { checkMigrationNeeded, initializeDirectories } from "./utils/directory-init";
import { showSpinnerToast, showToast } from "./utils/toast";

const OpenfleetPlugin: Plugin = async (ctx) => {
  initializeDirectories();

  logger.info("Plugin loaded");
  const saveConversation = createSaveConversationTool(ctx);
  const transcriptHooks = createTranscriptHooks(ctx);

  const { event: transcriptEvent, ...otherTranscriptHooks } = transcriptHooks;

  return {
    tool: {
      save_conversation: saveConversation,
    },

    config: async (config) => {
      configureAgents(config);
    },

    event: async ({ event }) => {
      if (event.type === "session.created") {
        const props = event.properties as { info?: { parentID?: string } } | undefined;
        if (!props?.info?.parentID) {
          setTimeout(async () => {
            if (checkMigrationNeeded()) {
              await showToast(ctx, {
                title: "⚠️ Openfleet Migration Required",
                message:
                  "Copy this: 'github.com/scottsus/openfleet/issues/11' to the chat, to migrate to v0.4.0",
                variant: "warning",
                duration: 10000,
              });
            } else {
              await showFleetToast(ctx);
            }
          }, 0);
        }
      }

      await transcriptEvent({ event });
    },

    ...otherTranscriptHooks,
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
