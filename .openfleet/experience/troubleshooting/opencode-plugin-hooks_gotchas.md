# OpenCode Plugin Hooks: Common Gotchas

## Symptoms

When implementing plugin hooks (`chat.message`, `tool.execute.before`, `tool.execute.after`):

- `UserMessage.content` is undefined or doesn't exist
- Types imported from `@opencode-ai/plugin` don't match runtime objects
- `tool.execute.after` doesn't receive tool input arguments

## Root Cause

The OpenCode plugin API has some non-obvious behaviors:

1. **Types live in `@opencode-ai/sdk`**, not `@opencode-ai/plugin`
2. **`UserMessage` doesn't have a `content` property** - message content comes from the `parts` array
3. **`tool.execute.after` hook doesn't receive tool input** - only the output

## Solution

### 1. Import types from the SDK

```typescript
// Wrong
import type { Part, UserMessage } from "@opencode-ai/plugin";
// Correct
import type { Part, UserMessage } from "@opencode-ai/sdk";
```

### 2. Extract content from parts

```typescript
function extractContentFromParts(parts: Part[]): string {
  return parts
    .filter((part): part is Part & { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}
```

### 3. Cache tool inputs for correlation

To include input in tool result entries, cache in `before` and retrieve in `after`:

```typescript
const toolInputCache = new Map<string, unknown>();
const MAX_CACHE_SIZE = 1000; // Prevent unbounded growth

// In tool.execute.before
if (toolInputCache.size >= MAX_CACHE_SIZE) {
  const oldest = toolInputCache.keys().next().value;
  if (oldest) toolInputCache.delete(oldest);
}
toolInputCache.set(callID, args);

// In tool.execute.after
const cachedInput = toolInputCache.get(callID);
toolInputCache.delete(callID); // Clean up
```

## Prevention

- Always test hook implementations with actual runtime data
- Don't trust LLD type assumptions - verify against actual API behavior
- When caching data across hooks, always include:
  - Cache size limits to prevent memory leaks
  - Cleanup logic to remove stale entries
