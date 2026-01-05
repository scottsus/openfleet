import type { Part, UserMessage } from "@opencode-ai/sdk";

import type { ToolResultEntry, ToolUseEntry, UserMessageEntry } from "./types";
import { appendTranscriptEntry, getTranscriptPath } from "./writer";

const MAX_CACHE_SIZE = 1000;
const toolInputCache = new Map<string, unknown>();

export interface SessionInfo {
  sessionID: string;
  parentID?: string;
}

export async function recordUserMessage(
  session: SessionInfo,
  message: UserMessage,
  parts: Part[],
): Promise<void> {
  const entry: UserMessageEntry = {
    type: "user",
    timestamp: new Date().toISOString(),
    content: extractContentFromParts(parts),
    parts: parts,
  };

  await appendTranscriptEntry(session.sessionID, entry, session.parentID);
}

export async function recordToolUse(
  session: SessionInfo,
  tool: string,
  callID: string,
  args: unknown,
): Promise<void> {
  // Prevent unbounded cache growth
  if (toolInputCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = toolInputCache.keys().next().value;
    if (oldestKey) toolInputCache.delete(oldestKey);
  }

  toolInputCache.set(callID, args);

  const entry: ToolUseEntry = {
    type: "tool_use",
    timestamp: new Date().toISOString(),
    tool,
    callID,
    input: args,
  };

  await appendTranscriptEntry(session.sessionID, entry, session.parentID);
}

export async function recordToolResult(
  session: SessionInfo,
  tool: string,
  callID: string,
  output: { title: string; output: string; metadata?: unknown },
): Promise<void> {
  const cachedInput = toolInputCache.get(callID);
  toolInputCache.delete(callID);

  const entry: ToolResultEntry = {
    type: "tool_result",
    timestamp: new Date().toISOString(),
    tool,
    callID,
    input: cachedInput,
    output: {
      title: output.title,
      output: output.output,
    },
    metadata: output.metadata,
  };

  await appendTranscriptEntry(session.sessionID, entry, session.parentID);
}

function extractContentFromParts(parts: Part[]): string {
  return parts
    .filter((part): part is Part & { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export { getTranscriptPath };
