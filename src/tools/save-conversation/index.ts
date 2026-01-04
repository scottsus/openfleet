import { homedir } from "os";
import * as path from "path";

import { tool } from "@opencode-ai/plugin";
import type { PluginInput } from "@opencode-ai/plugin";
import type { SessionMessagesResponse } from "@opencode-ai/sdk";

import { AGENT_NAMES } from "../../agents";
import { logger } from "../../logger";
import { showSpinnerToast, showToast } from "../../utils/toast";
import { getCurrentDate, getNextCounter } from "./counter";
import { calculateDuration, writeSession } from "./session-writer";
import { generateSlug, slugToTitle } from "./slug-generator";
import type { SessionEntry } from "./types";

type SessionMessage = SessionMessagesResponse[number];

const MAX_CONTEXT_LENGTH = 500;

export function createSaveConversationTool(ctx: PluginInput) {
  return tool({
    description: `Save the current conversation to a session file and compact context.

In line with your context management strategy, use this tool:
- After completing a feature or major task
- When context is getting large
- At natural stopping points

The tool will:
1. Generate a semantic filename based on conversation content
2. Save full conversation with enhanced metadata
3. Trigger context compaction (summarization)
4. Return the session path for future reference
`,
    args: {
      note: tool.schema.string().optional().describe("Optional note about what was accomplished"),
    },

    async execute(args, context) {
      const startTime = new Date();
      const { sessionID } = context;

      const stopSpinner = showSpinnerToast(ctx, {
        title: "💾 Saving Session...",
        message: "Housekeeping in progress, please wait...",
        variant: "info",
      });

      try {
        const { data: messages } = await ctx.client.session.messages({
          path: { id: sessionID },
          query: { directory: ctx.directory },
        });

        if (!messages || messages.length === 0) {
          return "No messages to save.";
        }

        const { tokensInput, tokensOutput, tokensBefore } = calculateTokens(messages);

        const contextString = buildContextString(messages, args.note);
        const slug = await generateSlug(contextString);
        const title = slugToTitle(slug);
        const date = getCurrentDate();
        const counter = await getNextCounter(date);
        const endTime = new Date();
        const duration = calculateDuration(startTime, endTime);

        // TODO: currently transcripts from oh-my-opencode with anthropic agents
        // are located in ~/.claude/transcripts as jsonl files
        const transcriptPath = path.join(homedir(), ".claude", "transcripts", `${sessionID}.jsonl`);

        const summary = await generateSummary(messages, slug);

        const entry: SessionEntry = {
          sessionID,
          savedAt: endTime.toISOString(),
          date,
          counter,
          slug,
          title,
          summary,
          note: args.note,
          tokensBefore,
          tokensInput,
          tokensOutput,
          transcriptPath,
          messageCount: messages.length,
          duration,
        };

        const sessionPath = writeSession(entry);
        logger.info("Session saved", { path: sessionPath });

        const sessionFilename = `${counter}_${slug}.md`;
        const sessionRelativePath = `sessions/${date}/${sessionFilename}`;

        const lastAssistant = [...messages].reverse().find((m) => m.info.role === "assistant");
        const providerID =
          lastAssistant?.info.role === "assistant" ? lastAssistant.info.providerID : "anthropic";
        const modelID =
          lastAssistant?.info.role === "assistant" ? lastAssistant.info.modelID : "claude-sonnet-4";

        // somehow, this MUST NOT be awaited, otherwise we don't
        // see the compaction tokens streaming in real time
        ctx.client.session
          .summarize({
            path: { id: sessionID },
            body: { providerID, modelID },
            query: { directory: ctx.directory },
          })
          .catch((err) => {
            logger.error("Summarize failed", err);
          });

        // similarly, we DON'T AWAIT here as it somehow blocks the compaction tokens
        // and instead render a toast that says housekeeping is in progress
        spawnHousekeepingAgent(ctx, {
          sessionFilename,
          sessionID,
          sessionTitle: title,
        })
          .then(async () => {
            await stopSpinner();
            await showToast(ctx, {
              title: "✅ Session Saved",
              message: `${sessionFilename} - Housekeeping complete`,
              variant: "success",
              duration: 3000,
            });
          })
          .catch(async (error) => {
            logger.error("Housekeeping failed", error);
            await stopSpinner();
            await showToast(ctx, {
              title: "⚠️ Session Saved",
              message: "Housekeeping failed (check logs)",
              variant: "warning",
              duration: 3000,
            });
          });

        return `✅ Conversation saved!

**Session**: \`${sessionRelativePath}\`
**Title**: ${title}
**Path**: ${sessionPath}
**Messages**: ${messages.length}
**Tokens**: ${tokensBefore.toLocaleString()} (${tokensInput.toLocaleString()} in, ${tokensOutput.toLocaleString()} out)

Housekeeping and compaction running in background.`;
      } catch (error) {
        logger.error("Failed to save conversation", error);
        return `❌ Failed to save conversation: ${error}`;
      }
    },
  });
}

async function spawnHousekeepingAgent(
  ctx: PluginInput,
  params: {
    sessionFilename: string;
    sessionID: string;
    sessionTitle: string;
  },
): Promise<void> {
  logger.info("Spawning housekeeping agent", params);

  try {
    const { data: childSession, error: createError } = await ctx.client.session.create({
      body: {
        parentID: params.sessionID,
        title: `Housekeeping: ${params.sessionTitle}`,
      },
      query: {
        directory: ctx.directory,
      },
    });

    if (createError || !childSession) {
      logger.error("Failed to create housekeeping child session", createError);
      throw new Error(`Failed to create child session: ${createError}`);
    }

    logger.info("Child session created for housekeeping", {
      childSessionID: childSession.id,
      parentSessionID: params.sessionID,
    });

    const housekeepingMessage = `Session saved: ${params.sessionFilename}

Session Details:
- Session ID: ${params.sessionID}
- Title: ${params.sessionTitle}
- Saved at: ${new Date().toISOString()}
`;

    const { error: promptError } = await ctx.client.session.prompt({
      path: { id: childSession.id },
      body: {
        agent: AGENT_NAMES.HOUSEKEEPING,
        parts: [
          {
            type: "text",
            text: housekeepingMessage,
          },
        ],
      },
      query: {
        directory: ctx.directory,
      },
    });

    if (promptError) {
      logger.error("Housekeeping agent execution failed", promptError);
      throw new Error(`Housekeeping agent failed: ${promptError}`);
    }

    logger.info("Housekeeping agent completed successfully", {
      childSessionID: childSession.id,
    });
  } catch (error) {
    logger.error("Housekeeping agent spawn failed", error);
    throw error;
  }
}

function calculateTokens(messages: SessionMessage[]): {
  tokensInput: number;
  tokensOutput: number;
  tokensBefore: number;
} {
  let tokensInput = 0;
  let tokensOutput = 0;

  for (const message of messages) {
    if (message.info.role === "assistant") {
      tokensInput += message.info.tokens.input ?? 0;
      tokensOutput += message.info.tokens.output ?? 0;
    }
  }

  return {
    tokensInput,
    tokensOutput,
    tokensBefore: tokensInput + tokensOutput,
  };
}

async function generateSummary(messages: SessionMessage[], slug: string): Promise<string> {
  const messageCount = messages.length;
  const userMessages = messages.filter((m) => m.info.role === "user").length;
  const assistantMessages = messages.filter((m) => m.info.role === "assistant").length;

  return `Work session focused on: ${slugToTitle(
    slug,
  )}. Exchanged ${messageCount} messages (${userMessages} user, ${assistantMessages} assistant). See transcript for full details.`;
}

function buildContextString(messages: SessionMessage[], note?: string): string {
  if (note) {
    return note.slice(0, MAX_CONTEXT_LENGTH);
  }

  const lastUserMessages = messages
    .filter((m) => m.info.role === "user")
    .slice(-3)
    .map((m) => {
      const summary = m.info.summary;
      if (typeof summary === "object" && summary) {
        return summary.title || summary.body || "";
      }
      return "";
    })
    .filter(Boolean)
    .join(". ")
    .slice(0, MAX_CONTEXT_LENGTH);

  return lastUserMessages || "Work session";
}
