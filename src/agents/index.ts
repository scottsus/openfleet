import { actorAgent } from "./actor";
import { aphroditeAgent } from "./aphrodite";
import { housekeepingAgent } from "./housekeeping";
import { AGENT_NAMES } from "./names";
import { orchestratorAgent } from "./orchestrator";
import { plannerAgent } from "./planner";
import { readonlyOrchestratorAgent } from "./read-only";
import { reflectorAgent } from "./reflector";
import { reviewerAgent } from "./reviewer";
import { scoutAgent } from "./scout";

export const agents = {
  [AGENT_NAMES.ORCHESTRATOR]: orchestratorAgent,
  [AGENT_NAMES.READ_ONLY_ORCHESTRATOR]: readonlyOrchestratorAgent,
  [AGENT_NAMES.SCOUT]: scoutAgent,
  [AGENT_NAMES.PLANNER]: plannerAgent,
  [AGENT_NAMES.ACTOR]: actorAgent,
  [AGENT_NAMES.REVIEWER]: reviewerAgent,
  [AGENT_NAMES.REFLECTOR]: reflectorAgent,
  [AGENT_NAMES.HOUSEKEEPING]: housekeepingAgent,
  [AGENT_NAMES.BROWSER]: aphroditeAgent,
};

export function configureAgents(config: { agent?: Record<string, unknown> }) {
  const nonOpenfleetAgents: Record<string, unknown> = {};
  for (const [name, agent] of Object.entries(config.agent ?? {})) {
    nonOpenfleetAgents[name] = {
      ...(agent as Record<string, unknown>),
      mode: "subagent",
    };
  }

  config.agent = {
    ...nonOpenfleetAgents,
    ...agents,
  };
}
