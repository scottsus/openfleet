import type { Tracer } from "@opentelemetry/api";
import type { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";

import { logger } from "../logger";
import type { LogfireConfig } from "./config";

const INIT_SYMBOL = Symbol.for("openfleet-telemetry-initialized");

interface InitializedState {
  provider: NodeTracerProvider;
  tracer: Tracer;
}

interface GlobalState {
  [key: symbol]:
    | { initialized: false; warnedNoToken?: boolean }
    | ({ initialized: true } & InitializedState)
    | undefined;
}

const globalState = globalThis as unknown as GlobalState;

function isInitialized(): boolean {
  return globalState[INIT_SYMBOL]?.initialized === true;
}

function hasWarnedNoToken(): boolean {
  const state = globalState[INIT_SYMBOL];
  return state !== undefined && !state.initialized && state.warnedNoToken === true;
}

function markNoTokenWarned(): void {
  globalState[INIT_SYMBOL] = { initialized: false, warnedNoToken: true };
}

function markInitialized(provider: NodeTracerProvider, tracer: Tracer): void {
  globalState[INIT_SYMBOL] = { provider, tracer, initialized: true };
}

function getTracer(): Tracer | null {
  const state = globalState[INIT_SYMBOL];
  if (state?.initialized) return state.tracer;
  return null;
}

async function initializeOTel(
  config: LogfireConfig,
): Promise<{ provider: NodeTracerProvider; tracer: Tracer } | null> {
  try {
    const { NodeTracerProvider, BatchSpanProcessor } =
      await import("@opentelemetry/sdk-trace-node");
    const { OTLPTraceExporter } = await import("@opentelemetry/exporter-trace-otlp-proto");
    const { Resource } = await import("@opentelemetry/resources");
    const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } =
      await import("@opentelemetry/semantic-conventions");

    const resource = new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion,
      ...(config.environment && { "deployment.environment": config.environment }),
    });

    const exporter = new OTLPTraceExporter({
      url: `${config.baseUrl}/v1/traces`,
      headers: { Authorization: config.token },
    });

    const provider = new NodeTracerProvider({ resource });
    const processor = new BatchSpanProcessor(exporter, {
      maxQueueSize: 100,
      maxExportBatchSize: 50,
      scheduledDelayMillis: 5000,
    });

    provider.addSpanProcessor(processor);
    provider.register();

    const tracer = provider.getTracer("openfleet-telemetry");

    if (config.debug) {
      logger.info(`Telemetry initialized: exporting to ${config.baseUrl}/v1/traces`);
    }

    return { provider, tracer };
  } catch (err) {
    logger.warn(`Telemetry init failed: ${err}. Telemetry disabled.`);
    return null;
  }
}

function registerShutdownHandlers(provider: NodeTracerProvider, debug: boolean): void {
  let shuttingDown = false;

  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;

    try {
      await provider.forceFlush();
      await provider.shutdown();
    } catch (err) {
      logger.warn(`Telemetry shutdown error: ${err}`);
    }
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  process.on("beforeExit", shutdown);
}

export {
  isInitialized,
  hasWarnedNoToken,
  markNoTokenWarned,
  markInitialized,
  getTracer,
  initializeOTel,
  registerShutdownHandlers,
};
