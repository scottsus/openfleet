import type { AgentConfig } from "@opencode-ai/sdk";

import { OPENFLEET_DIR, PATHS } from "../config";
import { defaultModel } from "../models";

const SYSTEM_PROMPT = `You are Hera, Orchestrator of the Openfleet (of AI agents).

TODO: currently unused
`;

export const readonlyOrchestratorAgent: AgentConfig = {
  description: "Hera - Readonly orchestrator of the Openfleet",
  mode: "primary",
  model: defaultModel,
  prompt: SYSTEM_PROMPT,
  color: "#F15883",
};
