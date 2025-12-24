import { tool } from "@opencode-ai/plugin";
import type { PluginInput } from "@opencode-ai/plugin";
import { homedir } from "os";
import * as path from "path";
import { writeJournal } from "./journal";

export function createSaveConversationTool(ctx: PluginInput) {
  return tool({
    description: `Save the current conversation to a journal file and compact context.
    
In line with your context management strategy, use this tool:
- After completing a feature or major task
- When context is getting large
- At natural stopping points

The tool will:
1. Save full conversation to a journal file
2. Trigger context compaction (summarization)
3. Return the journal path for future reference
`,
    args: {
      note: tool.schema
        .string()
        .optional()
        .describe("Optional note about what was accomplished"),
    },

    async execute(args, context) {
      const { sessionID } = context;

      const { data: messages } = await ctx.client.session.messages({
        path: { id: sessionID },
        query: { directory: ctx.directory },
      });

      if (!messages || messages.length === 0) {
        return "No messages to save.";
      }

      const lastAssistant = [...messages]
        .reverse()
        .find((m) => m.info.role === "assistant");

      const providerID =
        lastAssistant?.info.role === "assistant"
          ? lastAssistant.info.providerID
          : "anthropic";
      const modelID =
        lastAssistant?.info.role === "assistant"
          ? lastAssistant.info.modelID
          : "claude-sonnet-4";

      const tokensBefore = messages.reduce((sum, m) => {
        if (m.info.role === "assistant") {
          const tokens = m.info.tokens;
          if (tokens) {
            return sum + (tokens.input ?? 0) + (tokens.output ?? 0);
          }
        }
        return sum;
      }, 0);

      // TODO: currently transcripts from oh-my-opencode with anthropic agents
      // are located in ~/.claude/transcripts as jsonl files
      const transcriptPath = path.join(
        homedir(),
        ".claude",
        "transcripts",
        `${sessionID}.jsonl`
      );

      const journalPath = writeJournal({
        sessionID,
        savedAt: new Date().toISOString(),
        note: args.note,
        tokensBefore,
        transcriptPath,
        messageCount: messages.length,
      });

      ctx.client.session
        .summarize({
          path: { id: sessionID },
          body: { providerID, modelID },
          query: { directory: ctx.directory },
        })
        .catch((err) => {
          console.error("[openfleet] Summarize failed:", err);
        });

      return `✅ Conversation saved!

**Journal**: ${journalPath}
**Messages**: ${messages.length}
**Tokens before**: ${tokensBefore.toLocaleString()}

Context compaction triggered. The conversation will be summarized.
To recall details later, check the journal or grep the transcript.`;
    },
  });
}
