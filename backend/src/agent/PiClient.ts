import { ChatInput, ChatResult } from "./types";

export interface PiClient {
    runChat(input: ChatInput): Promise<ChatResult>
}
