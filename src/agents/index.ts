import { architectAgent } from "./architect";
import { builderAgent } from "./builder";
import { introspectorAgent } from "./introspector";
import { AGENT_NAMES } from "./names";
import { orchestratorAgent } from "./orchestrator";
import { reconAgent } from "./recon";
import { validatorAgent } from "./validator";

export const agents = {
  [AGENT_NAMES.ORCHESTRATOR]: orchestratorAgent,
  [AGENT_NAMES.SCOUT]: reconAgent,
  [AGENT_NAMES.PLANNER]: architectAgent,
  [AGENT_NAMES.ACTOR]: builderAgent,
  [AGENT_NAMES.REVIEWER]: validatorAgent,
  [AGENT_NAMES.REFLECTOR]: introspectorAgent,
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
