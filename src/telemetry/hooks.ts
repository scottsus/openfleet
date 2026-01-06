import { SpanStatusCode, type Span, type Tracer } from "@opentelemetry/api";

import type { LogfireConfig } from "./config";

interface TelemetryHooks {
  event?: (input: {
    event: { type: string; properties: Record<string, unknown> };
  }) => Promise<void>;
  "tool.execute.before"?: (
    input: { sessionID: string; tool: string; callID: string },
    output: { args: unknown },
  ) => Promise<void>;
  "tool.execute.after"?: (
    input: { sessionID: string; tool: string; callID: string },
    output: { title: string; output: string; metadata?: unknown },
  ) => Promise<void>;
  "chat.message"?: (
    input: { sessionID: string; agent?: string; model?: { providerID: string; modelID: string } },
    output: { parts: unknown[] },
  ) => Promise<void>;
}

function createTelemetryHooks(config: LogfireConfig | null, tracer: Tracer | null): TelemetryHooks {
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

export { createTelemetryHooks, type TelemetryHooks };
