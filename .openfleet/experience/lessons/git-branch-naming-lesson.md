# Git Branch Naming for Nested Hierarchies

## Context

When working with nested task branches in the SPARR story workflow, discovered that Git branch naming has constraints that affect the branch hierarchy structure.

**Story**: `fix-templates-init` (2026-01-30)

## Problem

Attempted to create nested branches using slashes to mirror the directory structure:

```bash
# Attempted (DOESN'T WORK):
git checkout -b feat/fix-templates-init/add-templates-to-source

# Error: Causes confusion with Git's ref structure
# Git interprets slashes as directory separators in .git/refs/heads/
```

## Root Cause

Git stores branches as files in `.git/refs/heads/`. A branch name like `feat/story/task` would create:

```
.git/refs/heads/feat/story/task
```

This conflicts with potential branch `feat/story` which would need to be both a directory and a file.

## Solution

Use **double dash `--`** to separate hierarchy levels instead of slashes:

```bash
# Correct pattern:
git checkout -b feat/<story-name>--<task-name>

# Example:
git checkout -b feat/fix-templates-init--add-templates-to-source
```

## Branch Naming Convention

| Level            | Pattern                                          | Example                                        |
| ---------------- | ------------------------------------------------ | ---------------------------------------------- |
| **Story branch** | `feat/<story-name>`                              | `feat/fix-templates-init`                      |
| **Task branch**  | `feat/<story-name>--<task-name>`                 | `feat/fix-templates-init--add-templates`       |
| **Sub-task**     | `feat/<story-name>--<task-name>--<subtask-name>` | `feat/fix-templates-init--add-templates--test` |

## Why This Works

- ✅ No Git ref conflicts (all branches are leaf nodes in refs tree)
- ✅ Clear hierarchy visible in branch name
- ✅ Easy to grep/filter: `git branch | grep "fix-templates-init"`
- ✅ Follows common convention (e.g., `dependabot` uses similar pattern)

## Application

### Creating Nested Branches

**Story branch** (created by Zeus):

```bash
git checkout -b feat/fix-templates-init
```

**Task branch** (created when starting task):

```bash
git checkout -b feat/fix-templates-init--add-templates-to-source
```

**Sub-task branch** (if issue discovered mid-task):

```bash
git checkout -b feat/fix-templates-init--add-templates--handle-edge-case
```

### Branch Visualization

The double dash makes hierarchy clear in `git branch` output:

```
* feat/fix-templates-init--add-templates-to-source
  feat/fix-templates-init
  main
```

Compared to flat naming, this maintains the relationship visually.

## Related

- **Runbook**: `complete-sparr-story.md` (Git Workflow section)
- **Story documentation**: `.openfleet/docs/fix-templates-init.md`
- **Alternative approaches**: Some projects use `_` or `-` as separators, but `--` is most visually distinct
