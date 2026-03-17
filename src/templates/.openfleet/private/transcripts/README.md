# Transcripts Directory

Human-readable Markdown transcripts of agent sessions.

## Format

Each session is stored as `{sessionID}.md` with entries:

- **User Message**: User messages with timestamp and content
- **Tool Use**: Tool invocations with call ID and input
- **Tool Result**: Tool outputs with input, output, and metadata

Entries are separated by `---` for readability.

## Subagent Transcripts

Subagent transcripts are stored in `{parentSessionID}/{subagentSessionID}.md`.

## Usage

```bash
# View full transcript
cat .openfleet/transcripts/{sessionID}.md

# Search for tool calls
grep "## Tool Use:" .openfleet/transcripts/{sessionID}.md

# Count tool calls
grep -c "## Tool Use:" .openfleet/transcripts/{sessionID}.md
```
