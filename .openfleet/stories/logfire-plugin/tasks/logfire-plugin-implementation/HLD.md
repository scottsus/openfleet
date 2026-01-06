# HLD: Logfire/OpenTelemetry Exporting for Openfleet

## Problem Statement

The openfleet npm package needs built-in telemetry capabilities to export spans to Logfire (Pydantic's observability platform). Currently, a standalone proof-of-concept plugin exists at `/Users/scottsus/workspace/opencode/.openfleet/stories/logfire-plugin/tasks/logfire-plugin-implementation/opencode-logfire/`, but this functionality should be integrated directly into the openfleet package.

### Key Challenges

1. **Auto-enablement**: Telemetry should activate automatically when `LOGFIRE_WRITE_TOKEN` or `LOGFIRE_TOKEN` environment variables are present, without requiring explicit user configuration.

2. **Plugin Loader Gotcha**: OpenCode's plugin loader invokes ALL module exports as plugin initializers. The current openfleet package exports only `default`, but future exports must be composed internally to avoid double-initialization or unintended side effects.

3. **Double-init Prevention**: OpenTelemetry providers should only initialize once per process, even if the plugin function is called multiple times (due to hot-reload, multiple imports, or plugin loader behavior).

4. **Bun + ESM Compatibility**: The OTLP exporter packages have known issues with ESM imports in Bun. Concrete strategies are needed to avoid runtime failures.

5. **Span Noise Management**: OpenCode emits many events. Tool execution spans are valuable; event spans are noisy and should be opt-in.

## High-Level Solution

### Architecture Overview

```
src/
├── index.ts                    # Single default export (composes all functionality)
├── telemetry/
│   ├── index.ts               # Telemetry initialization + hooks
│   ├── config.ts              # Environment-based configuration
│   ├── provider.ts            # OTel provider setup with Symbol guard
│   └── hooks.ts               # OpenCode hook implementations for spans
├── logger.ts                   # Existing logger (used for warnings)
└── ... (existing files)
```

### Environment Variables

| Variable               | Required                     | Description                                               |
| ---------------------- | ---------------------------- | --------------------------------------------------------- |
| `LOGFIRE_TOKEN`        | Yes (or LOGFIRE_WRITE_TOKEN) | Logfire API token (format: `pylf_v{n}_{region}_{secret}`) |
| `LOGFIRE_WRITE_TOKEN`  | Yes (or LOGFIRE_TOKEN)       | Alternative name for token                                |
| `LOGFIRE_REGION`       | No                           | Override region detection (`us` or `eu`)                  |
| `LOGFIRE_TRACE_EVENTS` | No                           | Enable event span tracing (default: `false`)              |
| `LOGFIRE_DEBUG`        | No                           | Enable debug logging (default: `false`)                   |
| `OTEL_SERVICE_NAME`    | No                           | Service name for spans (default: `openfleet`)             |
| `OTEL_SERVICE_VERSION` | No                           | Service version (default: package version)                |

### Lifecycle

1. **Plugin Load**: OpenCode imports and calls the default export from openfleet
2. **Telemetry Check**: Inside the plugin function (not top-level), check for token env vars
3. **Guard Check**: Use `Symbol.for("openfleet-telemetry-initialized")` to prevent double-init
4. **Provider Setup**: If first init and token present, create OTel provider and exporter
5. **Hook Registration**: Return hooks that create spans for tool execution
6. **Shutdown**: Register process handlers to flush spans on exit

### Safety Mechanisms

1. **Global Symbol Guard**: Uses `Symbol.for()` on `globalThis` to ensure single initialization across module boundaries and hot reloads.

2. **No Token = No Telemetry**: If environment variables are missing, telemetry is silently disabled (with one-time warning via logger).

3. **Graceful Degradation**: Exporter failures don't crash the plugin; spans are dropped silently.

4. **Attribute Truncation**: Large tool args/outputs are truncated before adding as span attributes (4KB limit for args, 1KB for output preview).

### Bun + ESM Approach

The `@opentelemetry/exporter-trace-otlp-proto` package uses protobuf which can have ESM issues. Strategy:

1. **Dynamic Import**: Import the exporter inside the init function, not at top-level
2. **Bundler Config**: tsup already handles ESM; ensure `"type": "module"` in package.json
3. **Fallback**: If protobuf import fails, log warning and disable telemetry (don't crash)

### Export Composition Pattern

To future-proof against the plugin loader invoking all exports:

```typescript
// Internal composition - not exported
function createTelemetryHooks(ctx: PluginInput): Partial<Hooks> { ... }
function createTranscriptHooks(ctx: PluginInput): Partial<Hooks> { ... }

// Single default export
const OpenfleetPlugin: Plugin = async (ctx) => {
  const telemetry = await initTelemetry(ctx);
  const transcript = createTranscriptHooks(ctx);

  return {
    ...telemetry,
    ...transcript,
    // ... other hooks merged
  };
};

export default OpenfleetPlugin;
```

No named exports of plugin functions. Helper utilities can be exported if needed, but never functions that match the `Plugin` signature.
