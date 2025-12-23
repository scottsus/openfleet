import type { Plugin } from "@opencode-ai/plugin";
import { configureAgents } from "./agents";

const OpenFleetPlugin: Plugin = async (ctx) => {
  console.log("[openfleet] Plugin loaded");

  return {
    config: async (config) => {
      console.log("[openfleet] Overriding agents");
      configureAgents(config);
      console.log("[openfleet] Agents now:", Object.keys(config.agent ?? {}));
    },
  };
};

export default OpenFleetPlugin;
