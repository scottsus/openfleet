export interface BaseEntry {
  timestamp: string;
}

export interface UserMessageEntry extends BaseEntry {
  type: "user";
  content: string;
  parts: unknown[];
}

export interface ToolUseEntry extends BaseEntry {
  type: "tool_use";
  tool: string;
  callID: string;
  input: unknown;
}

export interface ToolResultEntry extends BaseEntry {
  type: "tool_result";
  tool: string;
  callID: string;
  input: unknown;
  output: unknown;
  metadata?: unknown;
}

export type TranscriptEntry = UserMessageEntry | ToolUseEntry | ToolResultEntry;
