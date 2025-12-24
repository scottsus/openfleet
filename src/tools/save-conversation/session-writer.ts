import * as fs from "fs";
import * as path from "path";

import { PATHS } from "../../config";
import { logger } from "../../logger";
import type { SessionEntry } from "./types";

const SESSIONS_DIR = PATHS.sessions;

/**
 * Writes a session entry to the sessions directory.
 *
 * This function:
 * 1. ensures sessions directory exists
 * 2. builds filename from date, counter, and slug
 * 3. generates enhanced session content
 * 4. writes file atomically
 * 5. returns full file path
 */
export function writeSession(entry: SessionEntry): string {
  ensureSessionsDir();

  const filename = `${entry.date}_${entry.counter}_${entry.slug}.md`;
  const filepath = path.join(SESSIONS_DIR, filename);

  const content = buildSessionContent(entry);

  try {
    fs.writeFileSync(filepath, content, { encoding: "utf8" });
    return filepath;
  } catch (error) {
    logger.error("Failed to write session file", { path: filepath, error });
    throw new Error(`Session save failed: ${error}`);
  }
}

function buildSessionContent(entry: SessionEntry): string {
  const savedDate = new Date(entry.savedAt);
  const time = savedDate.toISOString().split("T")[1].split(".")[0];

  return `# Session: ${entry.title}

**Date**: ${entry.date}
**Time**: ${time} UTC
**Session ID**: ${entry.sessionID}
**Duration**: ${entry.duration ?? "Unknown"}
**Messages**: ${entry.messageCount}
**Tokens**: ${formatTokens(entry)}

## Summary

${entry.summary}

${entry.note ? `## Notes\n\n${entry.note}\n` : ""}## Transcript Location

\`${entry.transcriptPath}\`

## Recall Commands

\`\`\`bash
# View full transcript
cat "${entry.transcriptPath}"

# Search for specific content
grep "keyword" "${entry.transcriptPath}"

# Count tool calls
grep '"type":"tool_use"' "${entry.transcriptPath}" | wc -l

# Extract user messages only
grep '"role":"user"' "${entry.transcriptPath}"
\`\`\`

---

*Session saved: ${entry.savedAt}*

`;
}

function formatTokens(entry: SessionEntry): string {
  if (entry.tokensInput !== undefined && entry.tokensOutput !== undefined) {
    const total = entry.tokensInput + entry.tokensOutput;
    return `${total.toLocaleString()} (${entry.tokensInput.toLocaleString()} in, ${entry.tokensOutput.toLocaleString()} out)`;
  }

  return entry.tokensBefore.toLocaleString();
}

function ensureSessionsDir(): void {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

/**
 * Calculates session duration from timestamp metadata.
 * Returns formatted string like "45 minutes" or "2 hours 15 minutes".
 */
export function calculateDuration(startTime: Date, endTime: Date): string {
  const diffMs = endTime.getTime() - startTime.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`;
  }

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (minutes === 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }

  return `${hours} hour${hours !== 1 ? "s" : ""} ${minutes} minute${minutes !== 1 ? "s" : ""}`;
}
