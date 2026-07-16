import Anthropic from "@anthropic-ai/sdk";
import { PiClient } from "./PiClient";
import { ChatInput, ChatResult } from "./types";

export class RealPiClient implements PiClient {
  private client: Anthropic;
  private sessions = new Map<string, Anthropic.MessageParam[]>();

  constructor(private readonly tools: Anthropic.Messages.Tool[]) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Missing ANTHROPIC_API_KEY");
    }

    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async startChat(input: ChatInput): Promise<ChatResult> {
    const messages = this.sessions.get(input.sessionId) ?? [];

    messages.push({
      role: "user",
      content: input.message,
    });

    this.sessions.set(input.sessionId, messages);

    const response = await this.createMessage(messages);

    messages.push({
      role: "assistant",
      content: response.content,
    });

    return this.parseResponse(response);
  }

  async continueChat(input: {
    sessionId: string;
    toolResults: Array<{ toolCallId: string; result: string }>;
  }): Promise<ChatResult> {
    const messages = this.sessions.get(input.sessionId);

    if (!messages) {
      throw new Error("Session not found");
    }

    messages.push({
      role: "user",
      content: input.toolResults.map((tr) => ({
        type: "tool_result" as const,
        tool_use_id: tr.toolCallId,
        content: tr.result,
      })),
    });

    const response = await this.createMessage(messages);

    messages.push({
      role: "assistant",
      content: response.content,
    });

    return this.parseResponse(response);
  }

  private createMessage(messages: Anthropic.MessageParam[]) {
    return this.client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      tools: this.tools,
      messages,
    });
  }

  private parseResponse(response: Anthropic.Message): ChatResult {
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");

    const toolCalls = response.content
      .filter((block) => block.type === "tool_use")
      .map((block) => ({
        toolCallId: block.id,
        tool: block.name,
        arguments: block.input as Record<string, unknown>,
      }));

    return {
      message: text,
      toolCalls: toolCalls.length ? toolCalls : undefined,
    };
  }
}
