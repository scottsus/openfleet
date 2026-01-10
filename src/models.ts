export const models = {
  bedrock: {
    sonnet: "amazon-bedrock/anthropic.claude-sonnet-4-5-20250929-v1:0",
    opus: "amazon-bedrock/anthropic.claude-opus-4-5-20251101-v1:0",
    haiku: "amazon-bedrock/anthropic.claude-haiku-4-5-20251001-v1:0",
  },
  anthropic: {
    sonnet: "anthropic/claude-sonnet-4-5",
    opus: "anthropic/claude-opus-4-5",
    haiku: "anthropic/claude-haiku-4-5",
  },
  openai: {
    gpt5: "openai/gpt-5.2",
    o4Mini: "openai/o4-mini",
    o3: "openai/o3",
  },
  google: {
    gemini3Pro: "google/gemini-3-pro-high",
    gemini3Flash: "google/gemini-3-flash",
    gemini25Pro: "google/gemini-2.5-pro",
  },
} as const;

export const defaultModel = models.anthropic.opus;
export const smallModel = models.bedrock.haiku;
