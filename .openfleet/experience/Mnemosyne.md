# Mnemosyne

_The goddess of memory and mother of the Muses._

This is the index of accumulated experience. Consult before tackling unfamiliar problems.

## Recent Activity

- 2026-01-05: Added `opencode-plugin-hooks_gotchas.md` - transcript integration learnings

### Runbooks

_No runbooks yet._

### Troubleshooting Guides

- `opencode-plugin-hooks_gotchas.md` - UserMessage.content issue, SDK vs plugin imports, tool input caching pattern

### Lessons Learned

_No lessons yet._

### Blunders to Avoid

_No blunders recorded._

---

## Scratchpad

### Observations (not yet codified)

#### Format changes mid-implementation (1 occurrence)

**Observed**: 2026-01-05, Transcript Integration

The original research recommended JSONL format for technical merits (append efficiency, error recovery, streaming support). After seeing JSONL output during implementation, user requested Markdown for human readability.

**Assessment**: This is normal product development - stakeholder feedback overrides technical preference. Not worth a lesson since:

- Every developer knows this happens
- The right call was made (user preference wins for output format)
- Research correctly identified tradeoffs; decision was value judgment

**Action**: Monitor. If this pattern causes significant rework (>2 hours wasted) multiple times, consider a lesson about "prototype output format early for stakeholder buy-in."

#### Generic programming patterns (2 occurrences in review)

**Observed**: 2026-01-05, Transcript Integration Review

Chiron flagged:

1. Unbounded cache growth → fixed with MAX_CACHE_SIZE
2. TOCTOU race condition → fixed with appendFile instead of check-then-write

**Assessment**: These are standard programming gotchas, not Openfleet-specific. Every experienced developer should know:

- Caches need bounds
- Check-then-act patterns have race conditions

The OpenCode-specific part (why we need the cache in the first place) is documented in the troubleshooting guide.

**Action**: No codification needed. If review keeps catching the same class of bugs, consider adding to `standards/code-style.md`.

---

## File Naming Conventions

### Runbooks

Use lowercase kebab-case: `<task-name>.md`

- `deploy-to-production.md`
- `rotate-api-keys.md`
- `onboard-new-service.md`

### Troubleshooting

Use lowercase with underscore: `<error-type>_<context>.md`

- `build-failure_missing-deps.md`
- `runtime-error_null-pointer.md`
- `test-flake_async-timing.md`

### Lessons

Use lowercase kebab-case with suffix: `<topic>-lesson.md`

- `prefer-composition-over-inheritance-lesson.md`
- `batch-database-queries-lesson.md`
- `early-return-pattern-lesson.md`

### Blunders

Use lowercase kebab-case with suffix: `<descriptive-name>-blunder.md`

- `api-key-exposure-blunder.md`
- `missing-null-check-blunder.md`
- `wrong-environment-deploy-blunder.md`

---

## Templates

### Runbook

```markdown
# <Task name>

## Purpose

<What this runbook accomplishes>

## Prerequisites

- <What's needed before starting>
- <Required access, tools, etc.>

## Steps

1. <First actionable step>
2. Run `scripts/deploy.sh --env staging`
3. <Can reference scripts in the repo>

## Verification

- <How to confirm success>
- <Expected outcomes>
```

### Troubleshooting

```markdown
# <Error type>: <Brief description>

## Symptoms

- <How the problem manifests>
- <Error messages, behaviors observed>

## Root cause

<Why this happens - the underlying reason>

## Solution

1. <Step to fix>
2. <Next step>
3. <Continue as needed>

## Prevention

- <How to avoid this in the future>
- <Configuration, practices to adopt>
```

### Lesson

```markdown
# <Brief title of the lesson>

## Context

<When/where this was learned - the situation that led to this insight>

## Insight

<The key learning - what was discovered>

## Application

- <How to apply this going forward>
- <Specific practices to adopt>

## Related

- <Links to relevant docs, code, or external resources>
```

### Blunder

```markdown
# <Brief title describing the blunder>

## What happened

<Description of the mistake - what was done wrong>

## Impact

<What went wrong as a result - consequences>

## Root cause

<Why it happened - the underlying reason>

## Prevention

<How to avoid this in the future - proactive measures>

## Detection

<How to catch early if it happens again - monitoring/review steps>
```

---

_Updated when new experience is captured._
