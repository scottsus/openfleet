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
