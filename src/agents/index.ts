import { housekeepingAgent } from "./housekeeping";
import { orchestratorAgent } from "./orchestrator";
import { plannerAgent } from "./planner";

export const agents = {
  openfleet: orchestratorAgent,
  "Planner-Openfleet": plannerAgent,
  housekeeping: housekeepingAgent,
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
    openfleet: orchestratorAgent,
    "Planner-Openfleet": plannerAgent,
    housekeeping: housekeepingAgent,
  };
}
