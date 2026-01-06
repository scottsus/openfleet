# LLD: Logfire/OpenTelemetry Exporting for Openfleet

## Overview

This document details the exact file changes required to integrate Logfire telemetry into the openfleet npm package.

## Step 1: Add Dependencies

### File: `package.json`

Add the following dependencies:

```json
{
  "dependencies": {
    // ... existing deps
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/sdk-trace-node": "^1.30.0",
    "@opentelemetry/exporter-trace-otlp-proto": "^0.57.0",
    "@opentelemetry/resources": "^1.30.0",
    "@opentelemetry/semantic-conventions": "^1.34.0"
  }
}
```

**Test**: Run `bun install && bun run typecheck` - should pass without OTel-related errors.

---

## Step 2: Create Telemetry Configuration

### File: `src/telemetry/config.ts` (new)

```typescript
// Logfire configuration loaded from environment variables

interface LogfireConfig {
  token: string;
  serviceName: string;
  serviceVersion: string;
  environment?: string;
  baseUrl: string;
  debug: boolean;
  traceEvents: boolean;
}

const LOGFIRE_REGIONS: Record<string, string> = {
  us: "https://logfire-us.pydantic.dev",
  eu: "https://logfire-eu.pydantic.dev",
};

const LOGFIRE_TOKEN_PATTERN = /^pylf_v(?<version>[0-9]+)_(?<region>[a-z]+)_(?<token>[a-zA-Z0-9]+)$/;

function getRegionFromToken(token: string): string {
  const match = LOGFIRE_TOKEN_PATTERN.exec(token);
  const region = match?.groups?.region;
  if (region && region in LOGFIRE_REGIONS) return region;
  return "us";
}

function loadConfig(): LogfireConfig | null {
  const token = process.env.LOGFIRE_TOKEN || process.env.LOGFIRE_WRITE_TOKEN;
  if (!token) return null;

  const regionOverride = process.env.LOGFIRE_REGION;
  const region =
    regionOverride && regionOverride in LOGFIRE_REGIONS
      ? regionOverride
      : getRegionFromToken(token);
  const baseUrl = process.env.LOGFIRE_BASE_URL || LOGFIRE_REGIONS[region];

  return {
    token,
    serviceName: process.env.OTEL_SERVICE_NAME || "openfleet",
    serviceVersion: process.env.OTEL_SERVICE_VERSION || "0.1.0",
    environment: process.env.LOGFIRE_ENVIRONMENT,
    baseUrl,
    debug: process.env.LOGFIRE_DEBUG === "true",
    traceEvents: process.env.LOGFIRE_TRACE_EVENTS === "true",
  };
}

export { loadConfig, type LogfireConfig };
```

**Test**: Import in a test file, verify `loadConfig()` returns null without env vars, returns config with them.

---

## Step 3: Create OTel Provider with Symbol Guard

### File: `src/telemetry/provider.ts` (new)

```typescript
// OpenTelemetry provider initialization with double-init guard

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
  // Dynamic imports to handle Bun + ESM compatibility
  // If these fail, telemetry is disabled gracefully
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
```

**Test**: Call `isInitialized()` (should be false), call mock init, verify guard works on second call.

---

## Step 4: Create Telemetry Hooks

### File: `src/telemetry/hooks.ts` (new)

```typescript
// OpenCode hook implementations for span creation

import type { Hooks } from "@opencode-ai/plugin";
import { SpanStatusCode, type Span, type Tracer } from "@opentelemetry/api";

import type { LogfireConfig } from "./config";

function createTelemetryHooks(config: LogfireConfig | null, tracer: Tracer | null): Partial<Hooks> {
  if (!config || !tracer) return {};

  const activeToolSpans = new Map<string, Span>();

  return {
    ...(config.traceEvents && {
      async event({ event }: { event: { type: string; properties: Record<string, unknown> } }) {
        tracer.startActiveSpan(`openfleet.event.${event.type}`, (span) => {
          span.setAttributes({
            "openfleet.event.type": event.type,
            ...flattenObject("openfleet.event", event.properties),
          });
          span.end();
        });
      },
    }),

    async "tool.execute.before"(input, output) {
      const span = tracer.startSpan(`openfleet.tool.${input.tool}`, {
        attributes: {
          "openfleet.tool.name": input.tool,
          "openfleet.session.id": input.sessionID,
          "openfleet.tool.call_id": input.callID,
        },
      });

      activeToolSpans.set(input.callID, span);

      try {
        const argsStr = JSON.stringify(output.args);
        if (argsStr.length < 4096) {
          span.setAttribute("openfleet.tool.args", argsStr);
        } else {
          span.setAttribute("openfleet.tool.args_truncated", true);
        }
      } catch {
        // Args not serializable
      }
    },

    async "tool.execute.after"(input, output) {
      const span = activeToolSpans.get(input.callID);
      if (!span) return;

      span.setAttributes({
        "openfleet.tool.title": output.title,
        "openfleet.tool.output_length": output.output?.length ?? 0,
      });

      if (output.output && output.output.length < 1024) {
        span.setAttribute("openfleet.tool.output", output.output);
      } else if (output.output) {
        span.setAttribute("openfleet.tool.output_preview", output.output.slice(0, 1024));
      }

      if (output.metadata) {
        try {
          span.setAttribute("openfleet.tool.metadata", JSON.stringify(output.metadata));
        } catch {
          // Metadata not serializable
        }
      }

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      activeToolSpans.delete(input.callID);
    },

    async "chat.message"(input, output) {
      tracer.startActiveSpan("openfleet.chat.message", (span) => {
        span.setAttributes({
          "openfleet.session.id": input.sessionID,
          "openfleet.agent": input.agent ?? "unknown",
          "openfleet.message.parts_count": output.parts.length,
        });

        if (input.model) {
          span.setAttributes({
            "openfleet.model.provider": input.model.providerID,
            "openfleet.model.id": input.model.modelID,
          });
        }

        span.end();
      });
    },
  };
}

function flattenObject(
  prefix: string,
  obj: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = `${prefix}.${key}`;
    if (value === null || value === undefined) continue;

    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      result[fullKey] = value;
    } else if (typeof value === "object") {
      Object.assign(result, flattenObject(fullKey, value as Record<string, unknown>));
    }
  }

  return result;
}

export { createTelemetryHooks };
```

**Test**: Create mock tracer, verify hooks create spans with expected attributes.

---

## Step 5: Create Telemetry Index

### File: `src/telemetry/index.ts` (new)

```typescript
// Telemetry module entrypoint

import type { Hooks } from "@opencode-ai/plugin";

import { logger } from "../logger";
import { loadConfig } from "./config";
import { createTelemetryHooks } from "./hooks";
import {
  getTracer,
  hasWarnedNoToken,
  initializeOTel,
  isInitialized,
  markInitialized,
  markNoTokenWarned,
  registerShutdownHandlers,
} from "./provider";

async function initTelemetry(): Promise<Partial<Hooks>> {
  const config = loadConfig();

  // Already initialized - return hooks with existing tracer
  if (isInitialized()) {
    return createTelemetryHooks(config, getTracer());
  }

  // No token - warn once and return empty hooks
  if (!config) {
    if (!hasWarnedNoToken()) {
      logger.warn("LOGFIRE_TOKEN or LOGFIRE_WRITE_TOKEN not set. Telemetry disabled.");
      markNoTokenWarned();
    }
    return {};
  }

  // Initialize OTel provider
  const result = await initializeOTel(config);
  if (!result) return {};

  const { provider, tracer } = result;
  markInitialized(provider, tracer);
  registerShutdownHandlers(provider, config.debug);

  return createTelemetryHooks(config, tracer);
}

export { initTelemetry };
```

**Test**: With no env vars, verify `initTelemetry()` returns empty object. With token, verify hooks are returned.

---

## Step 6: Update Main Plugin Export

### File: `src/index.ts` (modify)

Change from:

```typescript
import type { Plugin, PluginInput } from "@opencode-ai/plugin";

import { configureAgents } from "./agents";
import { sleep } from "./lib/utils";
import { logger } from "./logger";
import { createSaveConversationTool } from "./tools/save-conversation";
import { createTranscriptHooks } from "./transcript";
import { initializeDirectories } from "./utils/directory-init";
import { showSpinnerToast } from "./utils/toast";

const OpenfleetPlugin: Plugin = async (ctx) => {
  initializeDirectories();

  logger.info("Plugin loaded");
  const saveConversation = createSaveConversationTool(ctx);
  const transcriptHooks = createTranscriptHooks(ctx);

  return {
    tool: {
      save_conversation: saveConversation,
    },

    config: async (config) => {
      configureAgents(config);
    },

    event: async ({ event }) => {
      if (event.type !== "session.created") return;

      const props = event.properties as { info?: { parentID?: string } } | undefined;
      if (props?.info?.parentID) return;

      setTimeout(async () => {
        await showFleetToast(ctx);
      }, 0);
    },

    ...transcriptHooks,
  };
};

async function showFleetToast(ctx: PluginInput): Promise<void> {
  const stopSpinner = showSpinnerToast(ctx, {
    title: "⛴️  Openfleet",
    message: "The Openfleet plugin is now at play.",
    variant: "info",
  });

  await sleep(5000);
  await stopSpinner();
}

export default OpenfleetPlugin;
```

To:

```typescript
import type { Hooks, Plugin, PluginInput } from "@opencode-ai/plugin";

import { configureAgents } from "./agents";
import { sleep } from "./lib/utils";
import { logger } from "./logger";
import { initTelemetry } from "./telemetry";
import { createSaveConversationTool } from "./tools/save-conversation";
import { createTranscriptHooks } from "./transcript";
import { initializeDirectories } from "./utils/directory-init";
import { showSpinnerToast } from "./utils/toast";

const OpenfleetPlugin: Plugin = async (ctx) => {
  initializeDirectories();

  logger.info("Plugin loaded");

  // Initialize all hook providers
  const saveConversation = createSaveConversationTool(ctx);
  const transcriptHooks = createTranscriptHooks(ctx);
  const telemetryHooks = await initTelemetry();

  // Compose event handlers
  const transcriptEvent = transcriptHooks.event;
  const telemetryEvent = telemetryHooks.event;

  const composedEventHandler = async ({ event }: { event: any }) => {
    // Telemetry event tracing (if enabled)
    await telemetryEvent?.({ event });

    // Toast on session creation
    if (event.type === "session.created") {
      const props = event.properties as { info?: { parentID?: string } } | undefined;
      if (!props?.info?.parentID) {
        setTimeout(async () => {
          await showFleetToast(ctx);
        }, 0);
      }
    }
  };

  // Compose tool hooks
  const toolExecuteBefore = async (input: any, output: any) => {
    await transcriptHooks["tool.execute.before"]?.(input, output);
    await telemetryHooks["tool.execute.before"]?.(input, output);
  };

  const toolExecuteAfter = async (input: any, output: any) => {
    await transcriptHooks["tool.execute.after"]?.(input, output);
    await telemetryHooks["tool.execute.after"]?.(input, output);
  };

  // Compose chat.message hooks
  const chatMessage = async (input: any, output: any) => {
    await transcriptHooks["chat.message"]?.(input, output);
    await telemetryHooks["chat.message"]?.(input, output);
  };

  return {
    tool: {
      save_conversation: saveConversation,
    },

    config: async (config) => {
      configureAgents(config);
    },

    event: composedEventHandler,
    "tool.execute.before": toolExecuteBefore,
    "tool.execute.after": toolExecuteAfter,
    "chat.message": chatMessage,
  };
};

async function showFleetToast(ctx: PluginInput): Promise<void> {
  const stopSpinner = showSpinnerToast(ctx, {
    title: "⛴️  Openfleet",
    message: "The Openfleet plugin is now at play.",
    variant: "info",
  });

  await sleep(5000);
  await stopSpinner();
}

// IMPORTANT: Only default export to avoid plugin loader double-invocation
export default OpenfleetPlugin;
```

**Key Changes**:

1. Import `initTelemetry` from new telemetry module
2. Call `await initTelemetry()` inside plugin function (not top-level)
3. Compose hooks from transcript and telemetry modules
4. Explicit comment about single default export

---

## Step 7: Update tsup/Build Configuration

### File: `package.json` (verify build includes new files)

The existing build command should work:

```json
{
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean && cp -r src/templates dist/"
  }
}
```

tsup will bundle `src/telemetry/*` automatically since they're imported by index.ts.

**Test**: Run `bun run build`, verify `dist/index.js` includes telemetry code.

---

## Local Test Plan

### 1. Build the Plugin

```bash
cd /Users/scottsus/workspace/openfleet
bun install
bun run build
```

### 2. Configure OpenCode to Use Local Plugin

Edit `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "experimental": {
    "openTelemetry": true,
  },
  "plugin": ["file:///Users/scottsus/workspace/openfleet/dist/index.js"],
}
```

### 3. Test Without Token (Graceful Disable)

```bash
unset LOGFIRE_TOKEN
unset LOGFIRE_WRITE_TOKEN
cd /some/project
opencode
# Verify: Should see one-time warning in .openfleet/openfleet.log
# Verify: Plugin works normally, no crashes
```

### 4. Test With Token

```bash
export LOGFIRE_TOKEN="pylf_v1_us_yourtoken"
export LOGFIRE_DEBUG=true
opencode
# Run a few tool calls
# Verify: Should see init message in logs
# Verify: Spans appear in Logfire dashboard
```

### 5. Test Event Tracing (Opt-in)

```bash
export LOGFIRE_TRACE_EVENTS=true
opencode
# Verify: Event spans appear (will be noisy)
```

### 6. Verify No Double-Init

1. Check that plugin only logs init once
2. Even if reloaded, Symbol guard prevents duplicate providers

---

## File Summary

| File                        | Action | Description                           |
| --------------------------- | ------ | ------------------------------------- |
| `package.json`              | Modify | Add OTel dependencies                 |
| `src/telemetry/config.ts`   | Create | Env var configuration                 |
| `src/telemetry/provider.ts` | Create | OTel provider + Symbol guard          |
| `src/telemetry/hooks.ts`    | Create | Span creation hooks                   |
| `src/telemetry/index.ts`    | Create | Module entrypoint                     |
| `src/index.ts`              | Modify | Compose telemetry with existing hooks |

---

## Rollback Plan

If issues arise:

1. Remove telemetry import from `src/index.ts`
2. Remove `src/telemetry/` directory
3. Remove OTel dependencies from `package.json`
4. Run `bun install && bun run build`

The plugin will work exactly as before.
