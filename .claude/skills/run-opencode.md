---
name: run-opencode-skill
description: Use whenever testing OpenFleet plugin changes
---

## Testing OpenFleet Plugin Changes

After making changes to the plugin, you must rebuild and verify it actually loads in opencode.

### Step 1: Build the plugin

```bash
cd /Users/scottsus/workspace/openfleet
bun run typecheck  # Should exit 0
bun run build      # Should exit 0, produces dist/index.js
```

### Step 2: Verify plugin loads correctly

Run opencode with `--print-logs` to see plugin initialization:

```bash
cd /Users/scottsus/workspace/openfleet
opencode run --print-logs "just say hi" 2>&1 | grep -E "\[openfleet\]"
```

Expected output:

```
[openfleet] Plugin loaded
[openfleet] Overriding agents
[openfleet] Agents before override: [ "Sisyphus", "oracle", "librarian", ... ]
[openfleet] Agents now: [ "openfleet", "build", "plan" ]
```

### Step 3: Verify specific features

**Check agents are registered:**

```bash
opencode run --print-logs "list available agents" 2>&1 | head -50
```

**Check tools are registered:**

```bash
opencode run --print-logs "what tools do you have?" 2>&1 | head -100
```

**Test a specific tool (e.g., save_conversation):**

```bash
opencode run --print-logs "use save_conversation tool with note 'test'" 2>&1
```

### Configuration

The plugin is registered in `~/.config/opencode/opencode.json`:

```json
{
  "plugin": [
    "oh-my-opencode",
    "opencode-antigravity-auth@1.2.2",
    "/Users/scottsus/workspace/openfleet/dist/index.js"
  ]
}
```

**Important**: OpenFleet must load AFTER oh-my-opencode so it can override the agents.

### Troubleshooting

**Plugin not loading?**

- Check the path in opencode.json is correct
- Ensure `dist/index.js` exists after build
- Check for build errors: `bun run build`

**TypeScript errors?**

- Run `bun run typecheck` to see detailed errors
- Check imports match `@opencode-ai/plugin` and `@opencode-ai/sdk` APIs

**Agents not overriding?**

- Verify plugin order in opencode.json (openfleet must be last)
- Check logs for `[openfleet] Agents before override:` to see what's available

### Quick Verification Checklist

| Check           | Command                                                 | Expected                               |
| --------------- | ------------------------------------------------------- | -------------------------------------- |
| Build passes    | `bun run build`                                         | Exit 0                                 |
| Types pass      | `bun run typecheck`                                     | Exit 0                                 |
| Plugin loads    | `opencode run --print-logs "hi" 2>&1 \| grep openfleet` | See `[openfleet] Plugin loaded`        |
| Agents override | Same as above                                           | See `Agents now: [ "openfleet", ... ]` |
