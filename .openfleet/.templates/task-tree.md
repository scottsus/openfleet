# Task Tree: {story-name}

**Last updated:** {timestamp}  
**Story branch:** `feat/{story-name}`  
**Status:** {status}  
**Current position:** {current-task-path}

---

## Tree

```
feat/{story-name}
 │
 └──► (tasks will be added here)
```

---

## Legend

```
├──► branch created
├─✅─ completed & merged
├─🚧─ blocked
├─⏸️─ paused/escalated
└─⏳─ pending

← YOU ARE HERE    (current working position)
← Agent working   (agent actively working on this)

Phases:
  R = Research.md
  H = HLD.md
  L = LLD.md
  I = Implementation.md

Status:
  ✅ done
  🔄 in progress
  ⏳ pending
  🚧 blocked
  ⏸️ paused
  ❌ failed
```

---

## Example (for reference)

```
feat/auth-redesign
 │
 ├──► task/01-05_jwt-validation (created 2026-01-15) ✅ merged 2026-01-18
 │     Phases: R✅ H✅ L✅ I✅
 │     │
 │     ├──► branch/fix-expiry (created 2026-01-16) ✅ resolved 2026-01-17
 │     │     Issue: Token expiry edge cases
 │     │     Phases: R✅ H✅ L✅ I✅
 │     │
 │     └──► branch/clock-skew (created 2026-01-17) ✅ merged 2026-01-17
 │           Phases: R✅ I✅
 │
 ├──► task/06-10_refresh-tokens (created 2026-01-19) ← YOU ARE HERE
 │     Phases: R✅ H✅ L🔄 I⏳
 │     Branch: feat/auth-redesign/refresh-tokens
 │     Agent: Architect (reviewing LLD.md)
 │     │
 │     └──► branch/temp-skip-rotation (created 2026-01-20) ⏸️ escalated
 │           Issue: Complex token rotation bug
 │           Temp fix: Added @skip marker
 │           Escalated to: story token-rotation-hardening
 │
 └──► task/11-15_session-hardening ⏳ pending
```

---

## Instructions for Orchestrator

**CRITICAL**: Update this file after EVERY change to THIS story:

- Task creation
- Subtask/branch creation
- Phase completion (Research, HLD, LLD, Implementation)
- Branch merge within this story
- Status change (blocked, paused, escalated)
- Position change (switching tasks within this story)

The tree MUST show:

1. Full hierarchy (task → subtask → branches)
2. Current position marker (`← YOU ARE HERE`)
3. Active agents (`← Builder working`)
4. Phase progress for each node (R/H/L/I with status)
5. Branch status (merged, blocked, escalated)
6. Git branch names
7. Timestamps for key events

**Never skip updating this file.** It's the user's primary navigation tool for this story.
