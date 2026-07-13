import { ChatInput, ChatResult, ToolResult } from "./types";

export interface PiClient {
  startChat(input: ChatInput): Promise<ChatResult>;
  continueChat(input: {
    sessionId: string;
    toolResults: ToolResult[];
  }): Promise<ChatResult>;
}
