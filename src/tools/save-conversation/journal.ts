import * as fs from "fs";
import { homedir } from "os";
import * as path from "path";

import type { JournalEntry } from "./types";

const JOURNALS_DIR = path.join(homedir(), ".openfleet", "journals");

export function ensureJournalsDir(): void {
  if (!fs.existsSync(JOURNALS_DIR)) {
    fs.mkdirSync(JOURNALS_DIR, { recursive: true });
  }
}

export function buildJournalContent(entry: JournalEntry): string {
  return `# Session Journal: ${entry.sessionID}

**Saved**: ${entry.savedAt}
**Note**: ${entry.note ?? "No note provided"}
**Messages**: ${entry.messageCount}
**Tokens Before Compaction**: ${entry.tokensBefore.toLocaleString()}

## Transcript Location

\`${entry.transcriptPath}\`

## Recall Commands

\`\`\`bash
# View full transcript
cat "${entry.transcriptPath}"

# Search for specific content
grep "keyword" "${entry.transcriptPath}"

# Count tool calls
grep '"type":"tool_use"' "${entry.transcriptPath}" | wc -l
\`\`\`
`;
}

export function writeJournal(entry: JournalEntry): string {
  ensureJournalsDir();
  const filename = `${entry.sessionID}.md`;
  const filepath = path.join(JOURNALS_DIR, filename);
  const content = buildJournalContent(entry);
  fs.writeFileSync(filepath, content);
  return filepath;
}
