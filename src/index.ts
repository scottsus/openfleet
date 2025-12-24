import type { Plugin } from "@opencode-ai/plugin";
import { configureAgents } from "./agents";
import { createSaveConversationTool } from "./tools/save-conversation";

const OpenfleetPlugin: Plugin = async (ctx) => {
  console.log("[openfleet] Plugin loaded");

  const saveConversation = createSaveConversationTool(ctx);

  return {
    tool: {
      save_conversation: saveConversation,
    },

    config: async (config) => {
      configureAgents(config);
    },
  };
};

export default OpenfleetPlugin;
