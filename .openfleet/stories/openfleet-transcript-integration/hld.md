# Transcript Integration - High Level Design

**Author**: Apollo (Planner)
**Date**: 2026-01-05
**Status**: Ready for Implementation

## Problem Statement

Openfleet currently depends on an external plugin (`oh-my-opencode`) to provide transcript recording functionality. The `save-conversation` tool assumes transcripts exist at `~/.claude/transcripts/{sessionID}.jsonl`, creating:

1. **External Dependency**: Users must install a separate plugin for full functionality
2. **Location Mismatch**: Transcripts stored globally instead of per-project
3. **Coupling**: Changes to `oh-my-opencode` could break Openfleet

## Solution Overview

Integrate native transcript recording directly into the Openfleet plugin using OpenCode's hook system. This eliminates external dependencies and stores transcripts within the project's `.openfleet/` directory.

**Key Decisions (from stakeholder input):**

- **Format**: Markdown (human-readable, easy to review)
- **Location**: `.openfleet/transcripts/{sessionID}.md`
- **Cleanup**: None for now (future enhancement)
- **Subagents**: Separate files with clear parent relationship
- **Backwards Compatibility**: No support for old `~/.claude/transcripts/` location
- **Configuration**: Always enabled (no config option)

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         OpenCode Runtime                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────┐    ┌─────────────┐    ┌────────────────────────┐   │
│   │    User     │───▶│ chat.message│───▶│   TranscriptRecorder   │   │
│   │  Message    │    │    hook     │    │                        │   │
│   └─────────────┘    └─────────────┘    │  ┌──────────────────┐  │   │
│                                         │  │  appendUserMsg() │  │   │
│   ┌─────────────┐    ┌─────────────┐    │  └────────┬─────────┘  │   │
│   │    Tool     │───▶│tool.execute │───▶│           │            │   │
│   │ Invocation  │    │   .before   │    │  ┌────────▼─────────┐  │   │
│   └─────────────┘    └─────────────┘    │  │ appendToolUse()  │  │   │
│                           │             │  └────────┬─────────┘  │   │
│   ┌─────────────┐         │             │           │            │   │
│   │    Tool     │    ┌────▼────────┐    │  ┌────────▼─────────┐  │   │
│   │   Result    │───▶│tool.execute │───▶│  │appendToolResult()│  │   │
│   └─────────────┘    │   .after    │    │  └────────┬─────────┘  │   │
│                      └─────────────┘    │           │            │   │
│                                         └───────────┼────────────┘   │
│                                                     │                │
│                                                     ▼                │
│                                    .openfleet/transcripts/           │
│                                    ├── {sessionID}.md                │
│                                    └── {parentID}/                   │
│                                        └── {subagentID}.md           │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### 1. TranscriptRecorder (`src/transcript/recorder.ts`)

- Maintains tool input cache (for `tool.execute.after` correlation)
- Exposes methods: `recordUserMessage()`, `recordToolUse()`, `recordToolResult()`
- Determines correct file path (handles subagent hierarchy)
- Delegates file I/O to TranscriptWriter

### 2. TranscriptWriter (`src/transcript/writer.ts`)

- Handles Markdown file operations
- Ensures directory exists before write
- Append operations with error handling
- Single responsibility: format entry as Markdown + append to file

### 3. Type Definitions (`src/transcript/types.ts`)

- `UserMessageEntry`: Captured user messages
- `ToolUseEntry`: Tool invocation with arguments
- `ToolResultEntry`: Tool output with cached input
- `TranscriptEntry`: Union type of all entry types

### 4. Updated Config (`src/config.ts`)

- Add `PATHS.transcripts` constant

### 5. Updated Directory Init (`src/utils/directory-init.ts`)

- Ensure `transcripts/` exists in template

## Data Flow

```
1. User sends message
   ├─► chat.message hook fires
   ├─► recorder.recordUserMessage(sessionID, message, parts)
   └─► writer.append(sessionID, UserMessageEntry)

2. Agent invokes tool
   ├─► tool.execute.before hook fires
   ├─► recorder.recordToolUse(sessionID, tool, callID, args)
   ├─► Cache: toolInputCache.set(callID, args)
   └─► writer.append(sessionID, ToolUseEntry)

3. Tool returns result
   ├─► tool.execute.after hook fires
   ├─► recorder.recordToolResult(sessionID, tool, callID, output)
   ├─► Retrieve: toolInputCache.get(callID), then delete
   └─► writer.append(sessionID, ToolResultEntry)
```

## Subagent Transcript Design

Subagent transcripts are stored in a directory named after the parent session:

```
.openfleet/transcripts/
├── ses_abc123.md                       # Parent session
└── ses_abc123/                         # Subagent directory
    ├── ses_def456.md                   # Subagent 1
    └── ses_ghi789.md                   # Subagent 2
```

**Detection Logic:**

- Session info contains `parentID` field when spawned as subagent
- If `parentID` exists: write to `transcripts/{parentID}/{sessionID}.md`
- If no `parentID`: write to `transcripts/{sessionID}.md`

**Benefits:**

- Clear visual hierarchy in file system
- Easy to find all subagent transcripts for a session
- Parent transcript stays at root level for quick access

## Scope

### In Scope

- Recording user messages via `chat.message` hook
- Recording tool invocations via `tool.execute.before` hook
- Recording tool results via `tool.execute.after` hook
- Markdown format for human readability
- Subagent transcript hierarchy
- Updating `save-conversation` tool to use new path

### Out of Scope

- Transcript cleanup/rotation (future enhancement)
- Compression of old transcripts
- Recording assistant messages (not available in current hooks)
- Configuration options (always enabled)
- Migration from old `~/.claude/transcripts/` location
- Reading/querying transcripts (existing grep commands sufficient)

## Entry Format

````markdown
# Transcript: ses_abc123

## [2026-01-05T17:41:01.935Z] User Message

Hello, can you help me read a file?

---

## [2026-01-05T17:41:05.160Z] Tool Use: read

**Call ID**: call_123

### Input

```json
{ "filePath": "/path/to/file.ts" }
```
````

---

## [2026-01-05T17:41:05.200Z] Tool Result: read

**Call ID**: call_123

### Output

```
File contents here...
```

---

```

## Success Criteria

1. All user messages recorded to transcript
2. All tool invocations recorded with arguments
3. All tool results recorded with both input and output
4. Subagent transcripts stored in parent directory
5. `save-conversation` tool uses new transcript location
6. No external plugin dependency required

## Risks & Mitigations

| Risk                                | Mitigation                               |
| ----------------------------------- | ---------------------------------------- |
| Performance impact from sync writes | Use async `fs.promises.appendFile`       |
| Large transcript files              | Accept for now; add rotation later       |
| Concurrent write corruption         | Use append mode; entries separated by `---` |
| Tool input not in after hook        | Cache in before hook using callID        |
```
