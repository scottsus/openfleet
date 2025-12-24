import * as fs from "fs";
import * as path from "path";

import { PATHS } from "../config";
import { logger } from "../logger";

/**
 * Initializes the ~/.openfleet directory structure with template files.
 *
 * Called on plugin load. Idempotent - safe to call multiple times.
 */
export function initializeDirectories(): void {
  const directories = [
    PATHS.status,
    PATHS.sessions,
    PATHS.tasks,
    PATHS.planning,
    path.join(PATHS.docs, "architecture"),
    path.join(PATHS.docs, "specs"),
    path.join(PATHS.planning, "decisions"),
    path.join(PATHS.archive, "sessions"),
    path.join(PATHS.archive, "tasks"),
    path.join(PATHS.archive, "docs"),
  ];

  for (const dir of directories) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      logger.info("Created directory", { path: dir });
    }
  }

  createTemplateFiles();
}

function createTemplateFiles(): void {
  const templates: Array<{ path: string; content: string }> = [
    {
      path: PATHS.statusFile,
      content: getStatusTemplate(),
    },
    {
      path: PATHS.activeTasks,
      content: getActiveTasksTemplate(),
    },
    {
      path: PATHS.plannedTasks,
      content: getPlannedTasksTemplate(),
    },
    {
      path: PATHS.backlogTasks,
      content: getBacklogTasksTemplate(),
    },
    {
      path: path.join(PATHS.status, "README.md"),
      content: getStatusReadme(),
    },
    {
      path: path.join(PATHS.tasks, "README.md"),
      content: getTasksReadme(),
    },
    {
      path: path.join(PATHS.docs, "README.md"),
      content: getDocsReadme(),
    },
  ];

  for (const { path: filePath, content } of templates) {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content, "utf8");
      logger.info("Created template file", { path: filePath });
    }
  }
}

function getStatusTemplate(): string {
  return `# Current Status

**Last Updated**: ${new Date().toISOString()}
**Session ID**: _none_
**Status**: idle

## Current Work

_No active work yet._

**Example format**:
> Implementing progressive context system for long-term agent memory.
>
> **Started**: 2025-12-23T20:00:00Z
> **Context**: Building housekeeping agent to maintain directory structure

## Recent Sessions

_No sessions yet._

**Example format**:
> 1. \`2025-12-23_003_implement-housekeeping.md\` ← current session
> 2. \`2025-12-23_002_add-directory-init.md\`
> 3. \`2025-12-23_001_design-architecture.md\`

## Quick Stats

- Sessions today: 0
- Sessions this week: 0
- Last housekeeping: _never_

---

_This file is automatically updated by Openfleet tools and the housekeeping agent._
`;
}

function getActiveTasksTemplate(): string {
  return `# Active Tasks

_Currently in progress (limit: 1-3 tasks)_

**Example format**:

## Task: Implement Progressive Context System

**Status**: In Progress
**Started**: 2025-12-23T20:00:00Z
**Priority**: High

### Description

Build hierarchical memory system with housekeeping agent.

### Acceptance Criteria

- [ ] Directory structure initialized
- [ ] Housekeeping agent implemented
- [ ] Orchestrator prompt updated
- [ ] Tests passing

### Related Documents

- HLD: \`docs/progressive-context-system-hld.md\`
- LLD: \`docs/progressive-context-system-lld.md\`

---

_Managed by orchestrator. Update this file when task state changes._
`;
}

function getPlannedTasksTemplate(): string {
  return `# Planned Tasks

_Prioritized backlog (next 5-10 tasks)_

**Example format**:

## Priority 1: Add Task Management Tools

**Estimated Effort**: 3 hours
**Dependencies**: None
**Value**: High

Create tools for task creation and status updates.

---

_Managed by orchestrator._
`;
}

function getBacklogTasksTemplate(): string {
  return `# Backlog

_Ideas and future work (unprioritized)_

- Session search by semantic similarity
- Automatic documentation generation
- Multi-project support
- Status dashboard (TUI)
- Integration with GitHub issues

---

_Managed by orchestrator._
`;
}

function getStatusReadme(): string {
  return `# Status Directory

Contains the current state of ongoing work.

## Files

- \`current.md\`: Current work status (auto-updated by save_conversation and housekeeping agent)

## Usage

The orchestrator reads \`current.md\` on startup to resume context.
Update manually when starting new tasks or changing work state.
`;
}

function getTasksReadme(): string {
  return `# Tasks Directory

Task tracking files organized by state.

## Files

- \`active.md\`: Currently in progress (1-3 tasks)
- \`planned.md\`: Prioritized backlog (next 5-10 tasks)
- \`backlog.md\`: Future ideas (unprioritized)

## Usage

Orchestrator manages these files using Read/Edit/Write tools.
Update when task state changes (start, complete, block).
`;
}

function getDocsReadme(): string {
  return `# Documentation Directory

Design documents organized by abstraction level.

## Structure

- \`architecture/\`: High-level system designs
- \`specs/\`: Detailed specifications
- \`decisions/\`: Architecture Decision Records (ADRs)

## Usage

Orchestrator creates and references these docs during design and implementation.
Follow progressive disclosure: architecture → specs → implementation.
`;
}
