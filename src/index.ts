import type { Plugin } from "@opencode-ai/plugin";

import { configureAgents } from "./agents";
import { logger } from "./logger";
import { createSaveConversationTool } from "./tools/save-conversation";

const FLEET_SPINNER = ["·", "•", "●", "○", "◌", "◦", " "];

const OpenfleetPlugin: Plugin = async (ctx) => {
  logger.info("Plugin loaded");

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

async function showFleetToast(ctx: any): Promise<void> {
  const totalDuration = 5000;
  const frameInterval = 150;
  const totalFrames = Math.floor(totalDuration / frameInterval);

  for (let i = 0; i < totalFrames; i++) {
    const spinner = FLEET_SPINNER[i % FLEET_SPINNER.length];
    await ctx.client.tui
      .showToast({
        body: {
          title: `${spinner} ⛴️  Openfleet`,
          message: "Admiral Kunkka is now steering opencode.",
          variant: "info" as const,
          duration: frameInterval + 50,
        },
      })
      .catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, frameInterval));
  }
}

export default OpenfleetPlugin;
