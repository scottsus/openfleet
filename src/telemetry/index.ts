import { logger } from "../logger";
import { loadConfig } from "./config";
import { createTelemetryHooks, type TelemetryHooks } from "./hooks";
import {
  getTracer,
  hasWarnedNoToken,
  initializeOTel,
  isInitialized,
  markInitialized,
  markNoTokenWarned,
  registerShutdownHandlers,
} from "./provider";

async function initTelemetry(): Promise<TelemetryHooks> {
  const config = loadConfig();

  if (isInitialized()) {
    return createTelemetryHooks(config, getTracer());
  }

  if (!config) {
    if (!hasWarnedNoToken()) {
      logger.warn("LOGFIRE_TOKEN or LOGFIRE_WRITE_TOKEN not set. Telemetry disabled.");
      markNoTokenWarned();
    }
    return {};
  }

  const result = await initializeOTel(config);
  if (!result) return {};

  const { provider, tracer } = result;
  markInitialized(provider, tracer);
  registerShutdownHandlers(provider, config.debug);

  return createTelemetryHooks(config, tracer);
}

export { initTelemetry };
