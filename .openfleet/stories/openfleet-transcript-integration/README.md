# Story: Openfleet Transcript Integration

**Created:** 2025-01-05
**Completed:** 2025-01-05
**Status:** complete

## Problem

Openfleet currently depends on `oh-my-opencode` being installed to provide transcript
functionality. This creates an external dependency that we want to eliminate.

## Goal

Make Openfleet self-contained by integrating transcript recording directly into the
Openfleet plugin, removing the dependency on `oh-my-opencode`.

## Requirements

1. Integrate transcript recording into the existing Openfleet plugin
2. Record user messages, tool invocations, and tool results
3. Use human-readable Markdown format
4. Store transcripts in `.openfleet/transcripts/{sessionID}.md`
5. Store subagent transcripts in `.openfleet/transcripts/{parentID}/{sessionID}.md`

## Decisions Made

| Question                | Decision                                             |
| ----------------------- | ---------------------------------------------------- |
| YAML vs JSONL vs MD     | **Markdown** - human readable, all details preserved |
| Transcript location     | `.openfleet/transcripts/` (project-local)            |
| Cleanup policy          | None for now (future enhancement)                    |
| Subagent transcripts    | Separate files in parent directory                   |
| Backwards compatibility | No - don't support old `~/.claude/transcripts/`      |
| Config option           | No - always record transcripts                       |

## Tasks

- [x] Scout: Research current transcript usage and format considerations
- [x] Plan: Create HLD and LLD
- [x] Act: Implement the integration
- [x] Review: Code review (2 major issues found and fixed)
- [x] Reflect: Document learnings

## Artifacts

- `research.md` - Scout findings
- `hld.md` - High-level design
- `lld.md` - Low-level design

## Implementation Summary

**Files Created:**

- `src/transcript/types.ts` - Entry type definitions
- `src/transcript/writer.ts` - Markdown file operations
- `src/transcript/recorder.ts` - Hook handlers with tool input caching
- `src/transcript/index.ts` - Public exports
- `src/templates/.openfleet/transcripts/README.md` - Template docs

**Files Modified:**

- `src/config.ts` - Added `PATHS.transcripts`
- `src/index.ts` - Added 3 transcript hooks + session info caching
- `src/tools/save-conversation/index.ts` - Uses new `getTranscriptPath()`

## Learnings Codified

- `.openfleet/experience/troubleshooting/opencode-plugin-hooks_gotchas.md`
