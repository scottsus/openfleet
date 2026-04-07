import type { Plugin, PluginInput } from "@opencode-ai/plugin";

import { configureAgents } from "./agents";
import { sleep } from "./lib/utils";
import { logger } from "./logger";
import { createTranscriptHooks } from "./transcript";
import { getPendingMigrations, initializeDirectories, stampVersion } from "./utils/directory-init";
import { showSpinnerToast, showToast } from "./utils/toast";

const OpenfleetPlugin: Plugin = async (ctx) => {
  initializeDirectories();

  logger.info("Plugin loaded");
  const transcriptHooks = createTranscriptHooks(ctx);

  const { event: transcriptEvent, ...otherTranscriptHooks } = transcriptHooks;

  return {
    // save_conversation disabled — compaction hangs due to unknown model/credential issue
    // see: https://github.com/user/starfleet/issues/TBD
    tool: {},

    config: async (config) => {
      configureAgents(config);
    },

    event: async ({ event }) => {
      if (event.type === "session.created") {
        const props = event.properties as { info?: { parentID?: string } } | undefined;
        if (!props?.info?.parentID) {
          setTimeout(async () => {
            const pending = getPendingMigrations();
            if (pending.length > 0) {
              const latest = pending[pending.length - 1];
              const message =
                pending.length === 1
                  ? `Run migration for v${latest}`
                  : `${pending.length} migrations pending (v${pending[0]} → v${latest})`;

              await showToast(ctx, {
                title: "⚠️ Openfleet Migration Required",
                message,
                variant: "warning",
                duration: 10000,
              });
            } else {
              stampVersion();
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
