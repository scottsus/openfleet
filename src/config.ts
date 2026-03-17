import * as path from "path";

/*
 * Directory Structure:
 *
 * .openfleet/                          # Project-local workspace
 * ├── status.md                        # Anchor point - always read first (gitignored)
 * ├── .templates/                      # Templates for new stories/tasks
 * │   └── task-tree.md                 # Template for story-scoped task trees
 * ├── agents/                          # Per-agent scratchpads (gitignored)
 * │   ├── Zeus.md
 * │   ├── Recon.md
 * │   ├── Architect.md
 * │   ├── Builder.md
 * │   ├── Validator.md
 * │   └── Introspector.md
 * ├── stories/                         # Working tree (gitignored)
 * │   └── <story-name>/
 * │       ├── task_tree.md
 * │       ├── README.md
 * │       ├── Research.md
 * │       ├── HLD.md
 * │       ├── LLD.md
 * │       ├── Implementation.md
 * │       └── tasks/
 * │           └── <MM-DD_task-name>/
 * │               ├── README.md
 * │               ├── Research.md
 * │               ├── HLD.md
 * │               ├── LLD.md
 * │               ├── Implementation.md
 * │               └── branches/        # Recursive branches
 * ├── docs/                            # Permanent only (committed)
 * │   └── <story-name>.md              # Compressed learnings
 * ├── experience/                      # Learned knowledge (committed)
 * │   ├── runbooks/
 * │   ├── troubleshooting/
 * │   ├── lessons/
 * │   └── blunders/
 * ├── standards/                       # Prescriptive guidelines (committed)
 * ├── sessions/                        # Conversation records (gitignored)
 * ├── transcripts/                     # Legacy transcripts (gitignored)
 * └── openfleet.log
 */

export const OPENFLEET_DIR = path.join(process.cwd(), ".openfleet");

export const PATHS = {
  agentsMd: path.join(process.cwd(), "AGENTS.md"),
  root: OPENFLEET_DIR,
  statusFile: path.join(OPENFLEET_DIR, "status.md"),
  templates: path.join(OPENFLEET_DIR, ".templates"),
  agents: path.join(OPENFLEET_DIR, "agents"),
  agentOrchestrator: path.join(OPENFLEET_DIR, "agents", "Zeus.md"),
  agentRecon: path.join(OPENFLEET_DIR, "agents", "Recon.md"),
  agentArchitect: path.join(OPENFLEET_DIR, "agents", "Architect.md"),
  agentBuilder: path.join(OPENFLEET_DIR, "agents", "Builder.md"),
  agentValidator: path.join(OPENFLEET_DIR, "agents", "Validator.md"),
  agentIntrospector: path.join(OPENFLEET_DIR, "agents", "Introspector.md"),
  sessions: path.join(OPENFLEET_DIR, "sessions"),
  stories: path.join(OPENFLEET_DIR, "stories"),
  docs: path.join(OPENFLEET_DIR, "docs"),
  experience: path.join(OPENFLEET_DIR, "experience"),
  runbooks: path.join(OPENFLEET_DIR, "experience", "runbooks"),
  troubleshooting: path.join(OPENFLEET_DIR, "experience", "troubleshooting"),
  lessons: path.join(OPENFLEET_DIR, "experience", "lessons"),
  blunders: path.join(OPENFLEET_DIR, "experience", "blunders"),
  standards: path.join(OPENFLEET_DIR, "standards"),
  reviews: path.join(OPENFLEET_DIR, "reviews"),
  transcripts: path.join(OPENFLEET_DIR, "transcripts"),
  logFile: path.join(OPENFLEET_DIR, "openfleet.log"),
} as const;

export function getCurrentWeek(): string {
  const now = new Date();
  const year = now.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const days = Math.floor((now.getTime() - oneJan.getTime()) / 86400000);
  const week = Math.ceil((days + oneJan.getDay() + 1) / 7);
  return `${year}-W${week.toString().padStart(2, "0")}`;
}

export function getTodayDate(): string {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  return `${month}-${day}`;
}

export function getFullDate(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}
