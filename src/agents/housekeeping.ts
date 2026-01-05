import type { AgentConfig } from "@opencode-ai/sdk";

import { OPENFLEET_DIR, PATHS } from "../config";
import { smallModel } from "../models";

const HOUSEKEEPING_PROMPT = `You are Hermes, Housekeeping Agent of the Openfleet.

TODO: currently unused
`;

export const housekeepingAgent: AgentConfig = {
  description: `Hermes - Housekeeping`,
  mode: "subagent",
  model: smallModel,
  prompt: HOUSEKEEPING_PROMPT,
  color: "#AA6138",
};
