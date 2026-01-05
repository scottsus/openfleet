# Transcript Integration Research

**Scout**: Athena
**Date**: 2026-01-05
**Status**: Complete

> **Format Decision Update (Post-Implementation)**: The original recommendation below was JSONL for its technical merits. However, after seeing JSONL output during implementation, the user requested **Markdown format** for improved human readability. The final implementation uses Markdown (`.md`) files instead of JSONL. All technical details about hooks, caching, and architecture remain valid - only the serialization format changed.

## Executive Summary

Openfleet currently depends on external `oh-my-opencode` plugin for transcript functionality, reading JSONL files from `~/.claude/transcripts/{sessionID}.jsonl`. This research confirms that integrating native transcript recording is feasible using OpenCode's plugin hooks: `chat.message`, `tool.execute.before`, and `tool.execute.after`.

**Key Recommendations:**

1. **Format**: Use JSONL (not YAML) - superior for append operations, error recovery, and tooling
2. **Location**: Store transcripts in `.openfleet/transcripts/{sessionID}.jsonl`
3. **Implementation**: Leverage existing plugin hook system with minimal code changes

## Current Openfleet Architecture

### Plugin Structure

```
src/
├── index.ts                    # Plugin entry point
├── config.ts                   # Path definitions
├── agents/                     # Agent configurations
├── tools/
│   └── save-conversation/      # Existing tool that CONSUMES transcripts
└── utils/
```

### Plugin Interface

The plugin returns a `Hooks` object with three main integration points:

```typescript
// src/index.ts
const OpenfleetPlugin: Plugin = async (ctx) => {
  return {
    tool: { save_conversation: ... },      // Custom tools
    config: async (config) => { ... },     // Agent configuration
    event: async ({ event }) => { ... },   // Event handling
  };
};
```

### Current Hook Usage

| Hook     | Current Usage            | Available for Transcripts      |
| -------- | ------------------------ | ------------------------------ |
| `tool`   | `save_conversation` tool | ✅ Could add transcript tools  |
| `config` | Agent configuration      | ❌ Not relevant                |
| `event`  | `session.created` toast  | ✅ Could expand for transcript |

## Current Transcript Usage in Openfleet

### Dependencies on External Transcripts

The `save-conversation` tool currently:

1. **Assumes external transcripts exist** at `~/.claude/transcripts/{sessionID}.jsonl`
2. **References transcript path** in saved session metadata
3. **Provides grep commands** for transcript analysis

**Key Code Reference** (`src/tools/save-conversation/index.ts:62-64`):

```typescript
// TODO: currently transcripts from oh-my-opencode with anthropic agents
// are located in ~/.claude/transcripts as jsonl files
const transcriptPath = path.join(homedir(), ".claude", "transcripts", `${sessionID}.jsonl`);
```

### Expected Transcript Format

Based on existing JSONL files at `~/.claude/transcripts/`:

```jsonl
{"type":"user","timestamp":"2026-01-05T17:41:01.935Z","content":"...user message..."}
{"type":"tool_use","timestamp":"2026-01-05T17:41:05.160Z","tool_name":"read","tool_input":{...}}
{"type":"tool_result","timestamp":"2026-01-05T17:41:05.162Z","tool_name":"read","tool_input":{...},"tool_output":{...}}
```

**Entry Types:**

- `user`: User messages with `content` field
- `tool_use`: Tool invocations with `tool_name` and `tool_input`
- `tool_result`: Tool results with `tool_output` (includes `tool_input` for correlation)

### Files That Reference Transcripts

| File                                            | Usage                                                    |
| ----------------------------------------------- | -------------------------------------------------------- |
| `src/tools/save-conversation/index.ts`          | Constructs transcript path, includes in session entry    |
| `src/tools/save-conversation/types.ts`          | `SessionEntry.transcriptPath` field                      |
| `src/tools/save-conversation/session-writer.ts` | Writes transcript path and grep commands to session file |

## YAML vs JSONL Analysis

### Comparison Matrix

| Factor                  | JSONL                     | YAML                    | Winner        |
| ----------------------- | ------------------------- | ----------------------- | ------------- |
| **Append Efficiency**   | O(1) - append line        | O(n) - rewrite file     | JSONL         |
| **Incremental Parsing** | Line-by-line streaming    | All-or-nothing          | JSONL         |
| **Human Readability**   | Good (with jq)            | Better visual hierarchy | YAML (slight) |
| **File Size**           | Smaller (~20% less)       | Larger (indentation)    | JSONL         |
| **Tooling**             | Excellent (jq, grep, awk) | Limited                 | JSONL         |
| **Real-time Streaming** | Native support            | Not supported           | JSONL         |
| **Error Recovery**      | Line isolation            | Catastrophic failure    | JSONL         |
| **Industry Standard**   | LLM providers use JSONL   | Not for logs            | JSONL         |

### Recommendation: JSONL

**Rationale:**

1. **Append Performance**: Conversations generate continuous entries. JSONL's O(1) append vs YAML's O(n) rewrite is critical for real-time logging.

2. **Error Recovery**: If crash occurs mid-conversation, JSONL preserves all previous entries. YAML corruption could lose entire transcript.

3. **Existing Compatibility**: Current grep commands in session files already assume JSONL:

   ```bash
   grep '"type":"tool_use"' "${entry.transcriptPath}" | wc -l
   ```

4. **Streaming**: Can `tail -f transcript.jsonl | jq .` for real-time monitoring.

5. **Memory Efficiency**: Large conversations don't require loading entire file into memory.

## Integration Strategy

### Available Plugin Hooks

The OpenCode plugin API provides these hooks for transcript recording:

```typescript
interface Hooks {
  // Capture user messages
  "chat.message"?: (
    input: { sessionID: string; agent?: string; messageID?: string },
    output: { message: UserMessage; parts: Part[] },
  ) => Promise<void>;

  // Capture tool invocations (with arguments)
  "tool.execute.before"?: (
    input: { tool: string; sessionID: string; callID: string },
    output: { args: any },
  ) => Promise<void>;

  // Capture tool results
  "tool.execute.after"?: (
    input: { tool: string; sessionID: string; callID: string },
    output: { title: string; output: string; metadata: any },
  ) => Promise<void>;
}
```

### Implementation Approach

#### 1. Create Transcript Module

```
src/
└── transcript/
    ├── index.ts           # Hook handlers + initialization
    ├── writer.ts          # JSONL append operations
    └── types.ts           # TranscriptEntry types
```

#### 2. Hook Integration Pattern

```typescript
// Pseudocode for src/index.ts changes
const OpenfleetPlugin: Plugin = async (ctx) => {
  initializeDirectories();
  const transcriptWriter = createTranscriptWriter();  // NEW

  return {
    tool: { save_conversation: ... },
    config: async (config) => { ... },

    // NEW: Capture user messages
    "chat.message": async (input, output) => {
      transcriptWriter.appendUserMessage(input.sessionID, output);
    },

    // NEW: Capture tool calls
    "tool.execute.before": async (input, output) => {
      transcriptWriter.appendToolUse(input.sessionID, input.tool, input.callID, output.args);
    },

    // NEW: Capture tool results
    "tool.execute.after": async (input, output) => {
      transcriptWriter.appendToolResult(input.sessionID, input.tool, input.callID, output);
    },
  };
};
```

#### 3. Transcript Storage Location

**Recommended**: `.openfleet/transcripts/{sessionID}.jsonl`

This keeps transcripts:

- Within project context (not global `~/.claude/`)
- Alongside existing `.openfleet/sessions/` data
- Under version control if desired

#### 4. Update save-conversation Tool

Change transcript path construction:

```typescript
// Before
const transcriptPath = path.join(homedir(), ".claude", "transcripts", `${sessionID}.jsonl`);

// After
const transcriptPath = path.join(PATHS.transcripts, `${sessionID}.jsonl`);
```

### Data Flow

```
User Message → chat.message hook → transcriptWriter.appendUserMessage()
                                         ↓
                                  .openfleet/transcripts/{sessionID}.jsonl
                                         ↑
Tool Call → tool.execute.before → transcriptWriter.appendToolUse()
Tool Result → tool.execute.after → transcriptWriter.appendToolResult()
```

### Important Implementation Detail: Tool Input Caching

The `tool.execute.after` hook does NOT receive the original tool input. The existing `oh-my-opencode` implementation solves this by:

1. Caching tool inputs in `tool.execute.before` using `callID` as key
2. Retrieving cached input in `tool.execute.after` to include in `tool_result` entry

```typescript
const toolInputCache = new Map<string, any>();

"tool.execute.before": async (input, output) => {
  toolInputCache.set(input.callID, output.args);  // Cache input
  // ... write tool_use entry
},

"tool.execute.after": async (input, output) => {
  const cachedInput = toolInputCache.get(input.callID);  // Retrieve
  toolInputCache.delete(input.callID);  // Cleanup
  // ... write tool_result entry with both input and output
}
```

## Risks and Considerations

### 1. Breaking Change: Transcript Location

**Risk**: Existing sessions reference `~/.claude/transcripts/`

**Mitigation Options**:

- Option A: Check both locations (old external, new internal)
- Option B: Migration script to copy existing transcripts
- Option C: Accept break - old sessions reference old location (acceptable)

**Recommendation**: Option C - old session files will still point to valid external paths if they exist. New sessions will use internal paths.

### 2. Disk Space

**Risk**: Transcripts can grow large (1-2MB per long session)

**Mitigation**:

- Add `.openfleet/transcripts/` to `.gitignore` by default
- Consider rotation/cleanup in housekeeping agent
- Monitor in `save_conversation` output

### 3. Concurrent Write Safety

**Risk**: Multiple hooks writing to same file simultaneously

**Mitigation**:

- Use append mode with atomic line writes
- JSONL format isolates entries to single lines
- Node.js `fs.appendFileSync` is atomic for single writes

### 4. Performance

**Risk**: Synchronous file writes could slow down tool execution

**Mitigation**:

- Use async file operations (`fs.promises.appendFile`)
- Consider write buffering for high-frequency events
- Profile actual impact (likely negligible)

## Open Questions for Planning Phase

1. **Cleanup Policy**: Should transcripts be automatically deleted after N days? After session deletion?

2. **Compression**: Should old transcripts be gzip compressed? When?

3. **Assistant Messages**: The current format doesn't include raw assistant messages (only user + tools). Should we capture assistant text via `event` hook listening for `message.updated`?

4. **Subagent Transcripts**: Each subagent has its own sessionID. Should subagent transcripts be stored separately or merged into parent session?

5. **Config Option**: Should transcript recording be configurable (on/off/location)?

6. **Backwards Compatibility**: Should we support reading from both old (`~/.claude/transcripts/`) and new (`.openfleet/transcripts/`) locations?

## Files to Modify

| File                                   | Change                                                                |
| -------------------------------------- | --------------------------------------------------------------------- |
| `src/index.ts`                         | Add `chat.message`, `tool.execute.before`, `tool.execute.after` hooks |
| `src/config.ts`                        | Add `PATHS.transcripts`                                               |
| `src/utils/directory-init.ts`          | Create `transcripts/` directory on init                               |
| `src/tools/save-conversation/index.ts` | Update transcript path construction                                   |
| `src/templates/.openfleet/`            | Add `transcripts/` directory to template                              |

## New Files to Create

| File                       | Purpose                                    |
| -------------------------- | ------------------------------------------ |
| `src/transcript/index.ts`  | Export transcript writer and hook handlers |
| `src/transcript/writer.ts` | JSONL append operations                    |
| `src/transcript/types.ts`  | `TranscriptEntry` union type               |

## References

- OpenCode Plugin API: `@opencode-ai/plugin@1.0.191`
- Existing transcript location: `~/.claude/transcripts/`
- Plugin hooks documentation: Analyzed from `@opencode-ai/plugin/dist/index.d.ts`
