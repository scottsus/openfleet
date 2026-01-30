import type { PluginInput } from "@opencode-ai/plugin";

import { logger } from "../logger";
import { formatConstraintsForCompaction } from "./critical-constraints";

export function createCompactionHook(_ctx: PluginInput) {
  return {
    "experimental.session.compacting": async (
      input: { sessionID: string },
      output: { context: string[]; prompt?: string },
    ): Promise<void> => {
      logger.info("Session compacting hook triggered", { sessionID: input.sessionID });

      const constraints = formatConstraintsForCompaction();
      output.context.push(constraints);

      logger.info("Injected critical constraints into compaction context", {
        sessionID: input.sessionID,
        constraintLength: constraints.length,
      });
    },
  };
}
