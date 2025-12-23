import { orchestratorAgent } from "./orchestrator";

export const agents = {
  openfleet: orchestratorAgent,
};

export function configureAgents(config: { agent?: Record<string, unknown> }) {
  console.log(
    "[openfleet] Agents before override:",
    Object.keys(config.agent ?? {})
  );
  
  config.agent = {
    openfleet: orchestratorAgent,
    build: { ...(config.agent?.build ?? {}), mode: "subagent" },
    plan: { ...(config.agent?.plan ?? {}), mode: "subagent" },
  };
}
