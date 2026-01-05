import { existsSync } from "fs";
import { appendFile, mkdir } from "fs/promises";
import * as path from "path";

import { PATHS } from "../config";
import { logger } from "../logger";
import type { ToolResultEntry, ToolUseEntry, TranscriptEntry, UserMessageEntry } from "./types";

export async function appendTranscriptEntry(
  sessionID: string,
  entry: TranscriptEntry,
  parentID?: string,
): Promise<void> {
  const filePath = getTranscriptPath(sessionID, parentID);
  const dir = path.dirname(filePath);

  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const needsHeader = !existsSync(filePath);
  const header = needsHeader ? `# Transcript: ${sessionID}\n\n` : "";
  const markdown = formatEntryAsMarkdown(entry);

  try {
    await appendFile(filePath, header + markdown, "utf-8");
  } catch (error) {
    logger.error("Failed to append transcript entry", { sessionID, error });
  }
}

export function getTranscriptPath(sessionID: string, parentID?: string): string {
  if (parentID) {
    return path.join(PATHS.transcripts, parentID, `${sessionID}.md`);
  }
  return path.join(PATHS.transcripts, `${sessionID}.md`);
}

function formatEntryAsMarkdown(entry: TranscriptEntry): string {
  const lines: string[] = [];

  switch (entry.type) {
    case "user":
      lines.push(...formatUserMessage(entry));
      break;
    case "tool_use":
      lines.push(...formatToolUse(entry));
      break;
    case "tool_result":
      lines.push(...formatToolResult(entry));
      break;
  }

  lines.push("---");
  lines.push("");

  return lines.join("\n");
}

function formatUserMessage(entry: UserMessageEntry): string[] {
  const lines: string[] = [];

  lines.push("## User Message");
  lines.push(`**Timestamp**: ${entry.timestamp}`);
  lines.push("");
  lines.push(entry.content);
  lines.push("");

  return lines;
}

function formatToolUse(entry: ToolUseEntry): string[] {
  const lines: string[] = [];

  lines.push(`## Tool Use: ${entry.tool}`);
  lines.push(`**Timestamp**: ${entry.timestamp}`);
  lines.push(`**Call ID**: ${entry.callID}`);
  lines.push("");
  lines.push("### Input");
  lines.push("```json");
  lines.push(JSON.stringify(entry.input, null, 2));
  lines.push("```");
  lines.push("");

  return lines;
}

function formatToolResult(entry: ToolResultEntry): string[] {
  const lines: string[] = [];

  lines.push(`## Tool Result: ${entry.tool}`);
  lines.push(`**Timestamp**: ${entry.timestamp}`);
  lines.push(`**Call ID**: ${entry.callID}`);
  lines.push("");

  lines.push("### Input");
  lines.push("```json");
  lines.push(JSON.stringify(entry.input, null, 2));
  lines.push("```");
  lines.push("");

  lines.push("### Output");
  lines.push(...formatOutput(entry.output));
  lines.push("");

  if (entry.metadata !== undefined) {
    lines.push("### Metadata");
    lines.push("```json");
    lines.push(JSON.stringify(entry.metadata, null, 2));
    lines.push("```");
    lines.push("");
  }

  return lines;
}

function formatOutput(output: unknown): string[] {
  const lines: string[] = [];

  if (typeof output === "object" && output !== null) {
    const obj = output as Record<string, unknown>;

    if ("title" in obj && typeof obj.title === "string") {
      lines.push(`**Title**: ${obj.title}`);
      lines.push("");
    }

    if ("content" in obj && typeof obj.content === "string") {
      lines.push("```");
      lines.push(obj.content);
      lines.push("```");
    } else {
      lines.push("```json");
      lines.push(JSON.stringify(output, null, 2));
      lines.push("```");
    }
  } else if (typeof output === "string") {
    lines.push("```");
    lines.push(output);
    lines.push("```");
  } else {
    lines.push("```json");
    lines.push(JSON.stringify(output, null, 2));
    lines.push("```");
  }

  return lines;
}
