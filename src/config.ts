import * as path from "path";

/*
 * Directory Structure:
 *
 * .openfleet/                          # Project-local workspace
 * ├── .templates/                      # Templates for new stories/tasks
 * │   └── task-tree.md
 * ├── README.md
 * ├── public/                          # Committed — shared knowledge
 * │   ├── docs/                        # Compressed story learnings
 * │   ├── standards/                   # Prescriptive guidelines
 * │   └── troubleshooting/             # Common error guides
 * └── private/                         # Gitignored — machine-local
 *     ├── agents/                      # Per-agent scratchpads
 *     │   ├── Zeus.md
 *     │   ├── Recon.md
 *     │   ├── Architect.md
 *     │   ├── Builder.md
 *     │   ├── Validator.md
 *     │   └── Introspector.md
 *     ├── stories/                     # Active working trees
 *     │   └── <story-name>/
 *     │       ├── task_tree.md
 *     │       ├── README.md
 *     │       ├── Research.md
 *     │       ├── HLD.md
 *     │       ├── LLD.md
 *     │       ├── Implementation.md
 *     │       └── tasks/
 *     │           └── <MM-DD_task-name>/
 *     │               ├── README.md
 *     │               ├── Research.md
 *     │               ├── HLD.md
 *     │               ├── LLD.md
 *     │               ├── Implementation.md
 *     │               └── branches/
 *     ├── status.md                    # Anchor point - always read first
 *     ├── experience/                  # Learned knowledge (runbooks, lessons)
 *     │   ├── runbooks/
 *     │   └── lessons/
 *     ├── transcripts/
 *     └── openfleet.log
 */

export const OPENFLEET_DIR = path.join(process.cwd(), ".openfleet");
const PUBLIC_DIR = path.join(OPENFLEET_DIR, "public");
const PRIVATE_DIR = path.join(OPENFLEET_DIR, "private");

export const PATHS = {
  agentsMd: path.join(process.cwd(), "AGENTS.md"),
  root: OPENFLEET_DIR,
  public: PUBLIC_DIR,
  private: PRIVATE_DIR,
  templates: path.join(OPENFLEET_DIR, ".templates"),
  statusFile: path.join(PRIVATE_DIR, "status.md"),
  agents: path.join(PRIVATE_DIR, "agents"),
  agentOrchestrator: path.join(PRIVATE_DIR, "agents", "Zeus.md"),
  agentRecon: path.join(PRIVATE_DIR, "agents", "Recon.md"),
  agentArchitect: path.join(PRIVATE_DIR, "agents", "Architect.md"),
  agentBuilder: path.join(PRIVATE_DIR, "agents", "Builder.md"),
  agentValidator: path.join(PRIVATE_DIR, "agents", "Validator.md"),
  agentIntrospector: path.join(PRIVATE_DIR, "agents", "Introspector.md"),
  stories: path.join(PRIVATE_DIR, "stories"),
  experience: path.join(PRIVATE_DIR, "experience"),
  runbooks: path.join(PRIVATE_DIR, "experience", "runbooks"),
  lessons: path.join(PRIVATE_DIR, "experience", "lessons"),
  transcripts: path.join(PRIVATE_DIR, "transcripts"),
  logFile: path.join(PRIVATE_DIR, "openfleet.log"),
  docs: path.join(PUBLIC_DIR, "docs"),
  standards: path.join(PUBLIC_DIR, "standards"),
  troubleshooting: path.join(PUBLIC_DIR, "troubleshooting"),
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
