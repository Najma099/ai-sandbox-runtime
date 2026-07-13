export interface ChatInput {
    sessionId: string;
    message: string;
}

export interface ChatResult {
    message: string;
    toolCalls?: ToolCall[];
}

export interface ToolCall {
    toolCallId: string;
    tool: string;
    arguments: Record<string, unknown>;
}

export interface ToolResult {
    toolCallId: string;
    result: string;
}

