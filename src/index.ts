import type { Plugin, PluginInput } from "@opencode-ai/plugin";

import { configureAgents } from "./agents";
import { sleep } from "./lib/utils";
import { logger } from "./logger";
import { initTelemetry } from "./telemetry";
import { createSaveConversationTool } from "./tools/save-conversation";
import { createTranscriptHooks } from "./transcript";
import { initializeDirectories } from "./utils/directory-init";
import { showSpinnerToast } from "./utils/toast";

const OpenfleetPlugin: Plugin = async (ctx) => {
  initializeDirectories();

  logger.info("Plugin loaded");

  const saveConversation = createSaveConversationTool(ctx);
  const transcriptHooks = createTranscriptHooks(ctx);
  const telemetryHooks = await initTelemetry();

  const telemetryEvent = telemetryHooks.event;

  const composedEventHandler = async ({ event }: { event: any }) => {
    await telemetryEvent?.({ event });

    if (event.type === "session.created") {
      const props = event.properties as { info?: { parentID?: string } } | undefined;
      if (!props?.info?.parentID) {
        setTimeout(async () => {
          await showFleetToast(ctx);
        }, 0);
      }
    }
  };

  const toolExecuteBefore = async (input: any, output: any) => {
    await transcriptHooks["tool.execute.before"]?.(input, output);
    await telemetryHooks["tool.execute.before"]?.(input, output);
  };

  const toolExecuteAfter = async (input: any, output: any) => {
    await transcriptHooks["tool.execute.after"]?.(input, output);
    await telemetryHooks["tool.execute.after"]?.(input, output);
  };

  const chatMessage = async (input: any, output: any) => {
    await transcriptHooks["chat.message"]?.(input, output);
    await telemetryHooks["chat.message"]?.(input, output);
  };

  return {
    tool: {
      save_conversation: saveConversation,
    },

    config: async (config) => {
      configureAgents(config);
    },

    event: composedEventHandler,
    "tool.execute.before": toolExecuteBefore,
    "tool.execute.after": toolExecuteAfter,
    "chat.message": chatMessage,
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

// IMPORTANT: Only default export to avoid plugin loader double-invocation
export default OpenfleetPlugin;
