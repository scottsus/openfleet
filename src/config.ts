import * as path from "path";

/*
 * Directory Structure:
 *
 * .openfleet/                          # Project-local workspace
 * ├── status/
 * │   └── current.md                   # Anchor point - always read first
 * ├── sessions/                        # Conversation records (auto-generated)
 * │   └── YYYY-MM-DD/
 * │       └── NNN_topic-slug.md
 * ├── stories/                         # Work organized by story
 * │   ├── YYYY-WXX/                    # Week-based organization
 * │   │   └── <story-name>/
 * │   │       ├── README.md
 * │   │       └── tasks/
 * │   │           └── MM-DD_<task-name>/
 * │   └── unassigned/                  # Tasks without a story
 * ├── docs/
 * │   └── working/                     # Agent scratch space
 * ├── experience/                          # Learned knowledge
 * │   ├── Mnemosyne.md                 # Index + recent activity
 * │   ├── runbooks/
 * │   ├── troubleshooting/
 * │   ├── lessons/
 * │   └── blunders/
 * ├── standards/                       # Prescriptive guidelines
 * ├── reviews/                         # Human review artifacts
 * └── openfleet.log
 */

export const OPENFLEET_DIR = path.join(process.cwd(), ".openfleet");

export const PATHS = {
  root: OPENFLEET_DIR,
  status: path.join(OPENFLEET_DIR, "status"),
  statusFile: path.join(OPENFLEET_DIR, "status", "current.md"),
  sessions: path.join(OPENFLEET_DIR, "sessions"),
  stories: path.join(OPENFLEET_DIR, "stories"),
  unassigned: path.join(OPENFLEET_DIR, "stories", "unassigned"),
  docs: path.join(OPENFLEET_DIR, "docs"),
  docsWorking: path.join(OPENFLEET_DIR, "docs", "working"),
  experience: path.join(OPENFLEET_DIR, "experience"),
  experienceIndex: path.join(OPENFLEET_DIR, "experience", "Mnemosyne.md"),
  runbooks: path.join(OPENFLEET_DIR, "experience", "runbooks"),
  troubleshooting: path.join(OPENFLEET_DIR, "experience", "troubleshooting"),
  lessons: path.join(OPENFLEET_DIR, "experience", "lessons"),
  blunders: path.join(OPENFLEET_DIR, "experience", "blunders"),
  standards: path.join(OPENFLEET_DIR, "standards"),
  reviews: path.join(OPENFLEET_DIR, "reviews"),
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
