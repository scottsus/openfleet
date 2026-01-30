# Complete a SPARR Story

## Purpose

Guide for completing a full story using the SPARR cycle (Scout → Plan → Act → Review → Reflect). This is the standard workflow for all stories in the Openfleet project.

## Prerequisites

- Story created by Zeus with branch `feat/<story-name>`
- Story directory exists at `.openfleet/stories/<story-name>/`
- Task tree initialized at `.openfleet/stories/<story-name>/task-tree.md`

## Phase Breakdown

### Phase 1: Scout (Athena - Research)

**Purpose**: Understand the problem and explore the codebase

**Outputs**: `Research.md` in story or task directory

**Key activities**:

- Analyze the problem statement
- Explore relevant code files
- Identify files to modify
- Assess complexity and risks
- Document findings with specific file paths and line numbers

**Session management**: Create or reuse Athena session

- Story-level: New session for initial story research
- Task-level: Can resume same session from story research

### Phase 2: Plan (Apollo - High/Low Level Design)

**Purpose**: Design the solution architecture

**Outputs**:

- `HLD.md` - High-level design (architecture, decisions, risks)
- `LLD.md` - Low-level design (exact commands, step-by-step)

**Key activities**:

- Review Research.md findings
- Make architectural decisions
- Assess risks and mitigation strategies
- Write deterministic implementation steps
- Define acceptance criteria

**Review gates**:

- HLD should be reviewed before LLD (use mdreview for human review)
- LLD should be reviewed before implementation

### Phase 3: Act (Hercules - Implementation)

**Purpose**: Execute the plan and implement the solution

**Outputs**: `Implementation.md` with results

**Key activities**:

- Follow LLD step-by-step
- Create comprehensive test scripts
- Run all tests and verify results
- Commit changes with clear messages
- Document any deviations from plan

**Testing approach**:

- Create executable test scripts (e.g., `test-<feature>.sh`)
- Include build verification, content verification, package verification
- Make tests deterministic with clear ✅/❌ output

### Phase 4: Review (Chiron - Code Review)

**Purpose**: Verify implementation quality and correctness

**Key activities**:

- Review commit changes
- Run test scripts independently
- Check for edge cases or concerns
- Verify acceptance criteria met
- Approve for merge or request changes

### Phase 5: Reflect (Mnemosyne - Capture Learnings)

**Purpose**: Codify knowledge for future reference

**Outputs**: Updates to `.openfleet/experience/` directories

**Key activities**:

- Analyze what worked well
- Document recurring patterns as runbooks
- Capture lessons learned
- Note troubleshooting solutions
- Update experience index

## Git Workflow

### Branch Structure

```
main
 │
 └──► feat/<story-name>
       │
       └──► feat/<story-name>--<task-name>  # Note: double dash for tasks
```

**IMPORTANT**: Use double dash `--` for task branches, not slashes

- ✅ `feat/fix-templates-init--add-templates-to-source`
- ❌ `feat/fix-templates-init/add-templates-to-source` (doesn't work)

### Commit Pattern

**Format**:

```
<type>: <brief description>

- <detailed change 1>
- <detailed change 2>
- <detailed change 3>

Resolves: <story-name>/<task-name>
```

**Example**:

```
fix: add .templates directory to source templates

- Add src/templates/.openfleet/.templates/task-tree.md (101 lines)
- Fix filename reference in Zeus orchestrator (story-task-tree.md → task-tree.md)
- Fresh OpenCode installations will now create .openfleet/.templates/
- Fixes ENOENT error when Zeus creates first story

Resolves: fix-templates-init/01-30_add-templates-to-source
```

## PR Creation Workflow

### Prerequisites

- All tests passing
- Changes committed to task branch
- Branch pushed to remote: `git push -u origin <branch-name>`

### Create PR

**Using gh CLI** (recommended):

```bash
# Create PR with heredoc for body formatting
gh pr create --title "Fix: Add .templates to source" --body "$(cat <<'EOF'
## Summary

- Fixed .openfleet/.templates/ not being created on fresh installations
- Added template file to source templates
- Updated filename reference in orchestrator

## Testing

- ✅ 8/8 automated tests passing
- ✅ Fresh installation verified
- ✅ Build successful

## Impact

- Fresh OpenCode installations now work correctly
- No manual workarounds needed
- Fully backward compatible
EOF
)"
```

**Output**: Returns PR URL (e.g., `https://github.com/scottsus/openfleet/pull/6`)

### After PR Merged

**GitHub auto-deletes the PR branch** - this is expected behavior.

If you try to delete manually:

```bash
git push origin --delete <branch-name>
# Error: remote ref does not exist
# This is HARMLESS - branch already deleted by GitHub
```

**Cleanup**:

```bash
# Switch to main
git checkout main

# Pull latest (includes merged changes)
git pull origin main

# Delete local task branch
git branch -D <task-branch-name>

# Delete local story branch (if story complete)
git branch -D <story-branch-name>
```

## Story Board Maintenance

Update the task tree after **every phase change**:

**File**: `.openfleet/stories/<story-name>/task-tree.md`

**After each phase**:

- Update phase status: `R✅`, `H✅`, `L✅`, `I✅`, `Review✅`
- Add review links if applicable
- Update test status
- Change position marker `← YOU ARE HERE`

**Example update**:

```
feat/fix-templates-init
 │
 └──► task/01-30_add-templates-to-source
       Phases: R✅ H✅ L✅ I🔄 Review⏳  # Implementation in progress
```

## Success Criteria

**Story is complete when**:

- [x] All tasks completed and merged to story branch
- [x] Story branch merged to main
- [x] PR closed and branches cleaned up
- [x] Documentation compressed to `.openfleet/docs/<story-name>.md`
- [x] Learnings codified in `.openfleet/experience/`

## Verification

```bash
# Check current position
git branch --show-current
# Should be: main

# Verify story merged
git log --oneline --grep="<story-name>"
# Should show merge commit

# Verify branches cleaned up
git branch -a | grep <story-name>
# Should be empty (no local or remote branches)
```

## Reference

**Successful example**: Story `fix-templates-init` (2026-01-30)

- Duration: ~20 minutes
- PR: https://github.com/scottsus/openfleet/pull/6
- Full SPARR cycle executed cleanly
- Documentation: `.openfleet/docs/fix-templates-init.md`
