import { actorAgent } from "./actor";
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
};

export function configureAgents(
  config: Record<string, unknown> & { agent?: Record<string, unknown> },
) {
  const demotedAgents: Record<string, unknown> = {};
  for (const [name, agent] of Object.entries(config.agent ?? {})) {
    demotedAgents[name] = {
      ...(agent as Record<string, unknown>),
      mode: "subagent",
      hidden: true,
    };
  }

  config.default_agent = AGENT_NAMES.ORCHESTRATOR;
  config.agent = {
    ...demotedAgents,
    ...agents,
  };
}
