export interface SaveConversationArgs {
  note?: string;
}

export interface JournalEntry {
  sessionID: string;
  savedAt: string;
  note?: string;
  tokensBefore: number;
  transcriptPath: string;
  messageCount: number;
}
