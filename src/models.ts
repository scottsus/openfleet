export const models = {
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

export const defaultModel = models.anthropic.sonnet;
export const smallModel = models.anthropic.haiku;
