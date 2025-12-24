import { homedir } from "os";
import * as path from "path";

/**
 * Central configuration for Openfleet paths.
 */
export const OPENFLEET_DIR = path.join(homedir(), ".openfleet");

export const PATHS = {
  root: OPENFLEET_DIR,
  status: path.join(OPENFLEET_DIR, "status"),
  sessions: path.join(OPENFLEET_DIR, "sessions"),
  tasks: path.join(OPENFLEET_DIR, "tasks"),
  planning: path.join(OPENFLEET_DIR, "planning"),
  docs: path.join(OPENFLEET_DIR, "docs"),
  archive: path.join(OPENFLEET_DIR, "archive"),

  // Specific files
  statusFile: path.join(OPENFLEET_DIR, "status", "current.md"),
  activeTasks: path.join(OPENFLEET_DIR, "tasks", "active.md"),
  plannedTasks: path.join(OPENFLEET_DIR, "tasks", "planned.md"),
  backlogTasks: path.join(OPENFLEET_DIR, "tasks", "backlog.md"),
} as const;
