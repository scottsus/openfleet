---
description: Save conversation and compact context
argument-hint: [note]
---

# Save Conversation

This command saves the current conversation to a session file and triggers context compaction.

## What It Does

When invoked, this command:

1. Generates a semantic filename based on conversation content
2. Saves full conversation with enhanced metadata
3. Spawns housekeeping utility agent as background task
4. Triggers context compaction (summarization)
5. Returns the session path for reference

The session is saved to:

```
~/.openfleet/sessions/YYYY-MM-DD_N_slug-name.md
```

## Arguments

**Optional note**: `$ARGUMENTS`

If the user provides an argument, use it as the note to describe what was accomplished in this session. Otherwise, the system will auto-generate a summary from recent messages.

## Instructions

Execute the `save_conversation` tool with the following parameters:

- If `$ARGUMENTS` is provided and not empty, pass it as the `note` parameter
- If `$ARGUMENTS` is empty, call the tool without the `note` parameter (auto-summary)

Example invocations:

```
/save
/save implemented user authentication
/save fixed bug in payment processing
```

## Implementation

```typescript
// If user provided a note
if ($ARGUMENTS && $ARGUMENTS.trim().length > 0) {
  await save_conversation({ note: $ARGUMENTS.trim() });
} else {
  await save_conversation();
}
```

Simply invoke the `save_conversation` tool - it handles all the complexity internally.
