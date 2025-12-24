import type { AgentConfig } from "@opencode-ai/sdk";
import { defaultModel } from "../models";

const SYSTEM_PROMPT = `You are the Fleet Navigator, Admiral Kunkka's chief strategist aboard Openfleet.

TODO: fill this in
`;

export const plannerAgent: AgentConfig = {
  description: "Openfleet planner",
  mode: "primary",
  model: defaultModel,
  prompt: SYSTEM_PROMPT,
  color: "#4169E1",
};
