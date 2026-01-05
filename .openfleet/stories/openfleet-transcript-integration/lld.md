# Transcript Integration - Low Level Design

**Author**: Apollo (Planner)
**Date**: 2026-01-05
**Status**: Ready for Implementation

## Implementation Order

The implementation is split into testable steps:

1. **Step 1**: Add types and path constants (no behavior change)
2. **Step 2**: Create transcript writer module (file I/O only)
3. **Step 3**: Create transcript recorder module (hook logic)
4. **Step 4**: Wire hooks in plugin entry point
5. **Step 5**: Update save-conversation to use new path
6. **Step 6**: Add transcripts directory to template

---

## Step 1: Types and Config

### File: `src/transcript/types.ts` (NEW)

```typescript
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
```

### File: `src/config.ts` (MODIFY)

Add `transcripts` to PATHS constant:

```typescript
export const PATHS = {
  // ... existing paths ...
  transcripts: path.join(OPENFLEET_DIR, "transcripts"),
} as const;
```

**Location**: Add after `reviews` (line 51), before `logFile`.

**Verification**: Run `bun run typecheck` - should pass with no errors.

---

## Step 2: Transcript Writer

### File: `src/transcript/writer.ts` (NEW)

```typescript
import { existsSync } from "fs";
import { appendFile, mkdir, readFile, writeFile } from "fs/promises";
import * as path from "path";

import { PATHS } from "../config";
import { logger } from "../logger";
import type { TranscriptEntry } from "./types";

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

  const markdown = formatEntryAsMarkdown(entry);

  try {
    // Initialize file with header if it doesn't exist
    if (!existsSync(filePath)) {
      await writeFile(filePath, `# Transcript: ${sessionID}\n\n`, "utf-8");
    }
    await appendFile(filePath, markdown, "utf-8");
  } catch (error) {
    logger.error("Failed to append transcript entry", { sessionID, error });
  }
}

function formatEntryAsMarkdown(entry: TranscriptEntry): string {
  switch (entry.type) {
    case "user":
      return `## [${entry.timestamp}] User Message\n\n${entry.content}\n\n---\n\n`;
    case "tool_use":
      return `## [${entry.timestamp}] Tool Use: ${entry.tool}\n\n**Call ID**: ${entry.callID}\n\n### Input\n\n\`\`\`json\n${JSON.stringify(entry.input, null, 2)}\n\`\`\`\n\n---\n\n`;
    case "tool_result":
      return `## [${entry.timestamp}] Tool Result: ${entry.tool}\n\n**Call ID**: ${entry.callID}\n\n### Output\n\n\`\`\`\n${truncateOutput(entry.output)}\n\`\`\`\n\n---\n\n`;
  }
}

function truncateOutput(output: unknown): string {
  const str = typeof output === "string" ? output : JSON.stringify(output, null, 2);
  const MAX_LENGTH = 5000;
  if (str.length > MAX_LENGTH) {
    return str.slice(0, MAX_LENGTH) + "\n... (truncated)";
  }
  return str;
}

export function getTranscriptPath(sessionID: string, parentID?: string): string {
  if (parentID) {
    return path.join(PATHS.transcripts, parentID, `${sessionID}.md`);
  }
  return path.join(PATHS.transcripts, `${sessionID}.md`);
}
```

**Verification**:

- Create a simple test script that imports `appendTranscriptEntry` and writes a mock entry
- Check that `.openfleet/transcripts/test.md` is created with valid Markdown

---

## Step 3: Transcript Recorder

### File: `src/transcript/recorder.ts` (NEW)

```typescript
import type { Part, UserMessage } from "@opencode-ai/plugin";

import type { ToolResultEntry, ToolUseEntry, UserMessageEntry } from "./types";
import { appendTranscriptEntry, getTranscriptPath } from "./writer";

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
    content: extractContent(message),
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
  // Cache the input for later correlation in tool.execute.after
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
  // Retrieve and remove cached input
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

function extractContent(message: UserMessage): string {
  // UserMessage can have various content structures
  // This extracts a string representation
  if (typeof message.content === "string") {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => (typeof part === "string" ? part : part.text || ""))
      .join("\n");
  }
  return JSON.stringify(message.content);
}

// Re-export for convenience
export { getTranscriptPath };
```

### File: `src/transcript/index.ts` (NEW)

```typescript
export { recordUserMessage, recordToolUse, recordToolResult, getTranscriptPath } from "./recorder";
export type { SessionInfo } from "./recorder";
export type { TranscriptEntry, UserMessageEntry, ToolUseEntry, ToolResultEntry } from "./types";
```

**Verification**:

- Import recorder functions in a test script
- Mock session info and call each function
- Verify Markdown file contains expected entries

---

## Step 4: Wire Hooks in Plugin

### File: `src/index.ts` (MODIFY)

Add imports at top:

```typescript
import { recordToolResult, recordToolUse, recordUserMessage } from "./transcript";
import type { SessionInfo } from "./transcript";
```

Modify the return object to include hooks:

```typescript
const OpenfleetPlugin: Plugin = async (ctx) => {
  initializeDirectories();

  logger.info("Plugin loaded");
  const saveConversation = createSaveConversationTool(ctx);

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

    // NEW: Transcript recording hooks
    "chat.message": async (input, output) => {
      const session = await getSessionInfo(ctx, input.sessionID);
      await recordUserMessage(session, output.message, output.parts);
    },

    "tool.execute.before": async (input, output) => {
      const session = await getSessionInfo(ctx, input.sessionID);
      await recordToolUse(session, input.tool, input.callID, output.args);
    },

    "tool.execute.after": async (input, output) => {
      const session = await getSessionInfo(ctx, input.sessionID);
      await recordToolResult(session, input.tool, input.callID, output);
    },
  };
};

// Session info cache to avoid repeated API calls
const sessionInfoCache = new Map<string, SessionInfo>();

async function getSessionInfo(ctx: PluginInput, sessionID: string): Promise<SessionInfo> {
  const cached = sessionInfoCache.get(sessionID);
  if (cached) return cached;

  // Get session details to check for parent
  try {
    const { data: session } = await ctx.client.session.get({
      path: { id: sessionID },
      query: { directory: ctx.directory },
    });

    const info: SessionInfo = {
      sessionID,
      parentID: session?.parentID,
    };

    sessionInfoCache.set(sessionID, info);
    return info;
  } catch {
    // Fallback if session lookup fails
    const info: SessionInfo = { sessionID };
    sessionInfoCache.set(sessionID, info);
    return info;
  }
}
```

**Verification**:

- Run opencode with the plugin
- Send a message and invoke a tool
- Check `.openfleet/transcripts/{sessionID}.md` exists with entries
- Verify user message, tool use, and tool result entries are present

---

## Step 5: Update save-conversation Tool

### File: `src/tools/save-conversation/index.ts` (MODIFY)

Remove the old transcript path logic and use the new module.

**Change 1**: Update imports (around line 1-13)

```typescript
// Remove: import { homedir } from "os";
// Add:
import { getTranscriptPath } from "../../transcript";
```

**Change 2**: Replace transcript path construction (around line 62-64)

```typescript
// Before:
// TODO: currently transcripts from oh-my-opencode with anthropic agents
// are located in ~/.claude/transcripts as jsonl files
const transcriptPath = path.join(homedir(), ".claude", "transcripts", `${sessionID}.md`);

// After:
const transcriptPath = getTranscriptPath(sessionID);
```

**Verification**:

- Run save_conversation tool
- Check output shows `.openfleet/transcripts/{sessionID}.md` path
- Verify the transcript file is readable Markdown

---

## Step 6: Add Template Directory

### Directory: `src/templates/.openfleet/transcripts/` (NEW)

Create empty directory with a `.gitkeep` file:

```
src/templates/.openfleet/transcripts/.gitkeep
```

Or add a README.md:

### File: `src/templates/.openfleet/transcripts/README.md` (NEW)

````markdown
# Transcripts Directory

Markdown transcripts of agent sessions.

## Format

Each session is stored as `{sessionID}.md` with sections:

- **User Message**: User messages with timestamp
- **Tool Use**: Tool invocations with arguments (JSON)
- **Tool Result**: Tool outputs

## Subagent Transcripts

Subagent transcripts are stored in `{parentSessionID}/{subagentSessionID}.md`.

## Usage

```bash
# View full transcript
cat .openfleet/transcripts/{sessionID}.md

# View first 50 lines
head -50 .openfleet/transcripts/{sessionID}.md
```
````

````

**Verification**:
- Delete `.openfleet/` directory
- Run plugin (triggers directory initialization)
- Verify `transcripts/` directory is created with README

---

## File Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `src/transcript/types.ts` | CREATE | ~35 |
| `src/transcript/writer.ts` | CREATE | ~40 |
| `src/transcript/recorder.ts` | CREATE | ~80 |
| `src/transcript/index.ts` | CREATE | ~5 |
| `src/config.ts` | MODIFY | +1 |
| `src/index.ts` | MODIFY | +40 |
| `src/tools/save-conversation/index.ts` | MODIFY | -3, +2 |
| `src/templates/.openfleet/transcripts/README.md` | CREATE | ~25 |

**Total**: 4 new files, 3 modified files

---

## Testing Approach

### Manual Testing Checklist

1. **User Message Recording**
   - [ ] Send a user message
   - [ ] Verify `User Message` section in transcript Markdown
   - [ ] Check timestamp and content fields

2. **Tool Recording**
   - [ ] Invoke a tool (e.g., `read` file)
   - [ ] Verify `Tool Use` section with correct input JSON
   - [ ] Verify `Tool Result` section with output
   - [ ] Confirm `callID` matches between entries

3. **Subagent Hierarchy**
   - [ ] Spawn a subagent (background task or similar)
   - [ ] Verify subagent transcript at `transcripts/{parentID}/{subagentID}.md`
   - [ ] Verify parent transcript at `transcripts/{parentID}.md`

4. **save-conversation Integration**
   - [ ] Run `save_conversation` tool
   - [ ] Verify transcript path in output points to `.openfleet/transcripts/`
   - [ ] Verify transcript file is readable Markdown

5. **New Project Initialization**
   - [ ] Delete `.openfleet/` directory
   - [ ] Restart opencode (triggers init)
   - [ ] Verify `transcripts/` directory created

### Edge Cases

- Empty tool arguments: Should record `input: {}`
- Large tool output: Should be truncated or handled gracefully
- Rapid tool calls: Verify no race conditions in append
- Session lookup failure: Should fallback gracefully (no parentID)

---

## Implementation Notes

### Why Cache Tool Inputs?

The `tool.execute.after` hook does NOT receive the original tool input (only the output). To include both in the `tool_result` entry (for easier debugging/analysis), we cache the input in `tool.execute.before` using the `callID` as the key.

```typescript
// tool.execute.before
toolInputCache.set(callID, args);  // Cache for later

// tool.execute.after
const input = toolInputCache.get(callID);  // Retrieve
toolInputCache.delete(callID);  // Cleanup to prevent memory leak
````

### Why Async Writes?

Using `fs.promises.appendFile` instead of `appendFileSync` prevents blocking the main thread during file I/O. This is important because:

1. Transcript writes happen on every hook event
2. Blocking could slow down tool execution
3. Markdown sections are separated by `---` dividers

### Session Info Caching

We cache session info (including parentID) to avoid repeated API calls:

```typescript
const sessionInfoCache = new Map<string, SessionInfo>();
```

This is safe because:

- `parentID` never changes for a session
- Cache is per-plugin-instance (cleared on restart)
- Reduces latency for every hook invocation

---

## Dependencies

No new dependencies required. Uses:

- `fs/promises` (Node.js built-in)
- `@opencode-ai/plugin` types (already installed)

---

## Appendix: OpenCode Plugin API Reference

### Hook Types (from `@opencode-ai/plugin` v1.0.191)

```typescript
// chat.message hook
"chat.message"?: (
  input: {
    sessionID: string;
    agent?: string;
    model?: { providerID: string; modelID: string };
    messageID?: string;
  },
  output: {
    message: UserMessage;
    parts: Part[];
  }
) => Promise<void>;

// tool.execute.before hook
"tool.execute.before"?: (
  input: {
    tool: string;
    sessionID: string;
    callID: string;
  },
  output: {
    args: any;
  }
) => Promise<void>;

// tool.execute.after hook
"tool.execute.after"?: (
  input: {
    tool: string;
    sessionID: string;
    callID: string;
  },
  output: {
    title: string;
    output: string;
    metadata: any;
  }
) => Promise<void>;
```

### Session Type

```typescript
type Session = {
  id: string;
  projectID: string;
  directory: string;
  parentID?: string; // Present for subagent sessions
  title: string;
  version: string;
  time: { created: number; updated: number };
  // ... other fields
};
```

### Session ID Format

- Pattern: `ses_<random_string>` (e.g., `ses_abc123def456`)
- Unique identifier for each conversation session

---

## Addendum: Follow-up Fixes

Three follow-up fixes needed after the JSONL → Markdown format change.

### Fix 1: Update Recall Commands in session-writer.ts

**File**: `src/tools/save-conversation/session-writer.ts`

The grep commands in the "Recall Commands" section still use JSONL patterns. Update to match Markdown format.

**Change** (lines 61-73 in `buildSessionContent`):

```typescript
// Before:
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

// After:
\`\`\`bash
# View full transcript
cat "${entry.transcriptPath}"

# Search for specific content
grep "keyword" "${entry.transcriptPath}"

# Count tool calls
grep -c "## \\[.*\\] Tool Use:" "${entry.transcriptPath}"

# Extract user messages only
grep -A 5 "## \\[.*\\] User Message" "${entry.transcriptPath}"
\`\`\`
```

**Rationale**: Markdown transcripts use `## [timestamp] Tool Use:` and `## [timestamp] User Message` headers.

---

### Fix 2: Add Transcripts to Project .gitignore

**File**: `.gitignore`

Transcripts may contain sensitive data (API keys, secrets in tool outputs). Add to gitignore.

**Append**:

```gitignore
# Openfleet transcripts (may contain sensitive data)
.openfleet/transcripts/
```

---

### Fix 3: Add .gitignore to Template Transcripts Directory

**File**: `src/templates/.openfleet/transcripts/.gitignore` (NEW)

Ensures new projects automatically ignore transcript contents while keeping the directory.

**Content**:

```gitignore
# Ignore all transcript files
*.md

# But keep this .gitignore
!.gitignore
```

---

### File Summary (Addendum)

| File                                              | Action | Change                            |
| ------------------------------------------------- | ------ | --------------------------------- |
| `src/tools/save-conversation/session-writer.ts`   | MODIFY | Update grep patterns for Markdown |
| `.gitignore`                                      | MODIFY | Add `.openfleet/transcripts/`     |
| `src/templates/.openfleet/transcripts/.gitignore` | CREATE | Ignore `*.md` in template         |
