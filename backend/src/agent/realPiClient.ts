import Anthropic from "@anthropic-ai/sdk";
import { PiClient } from "./PiClient";
import { ChatInput, ChatResult } from "./types";

export class RealPiClient implements PiClient {
  private client: Anthropic;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Missing ANTHROPIC_API_KEY");
    }
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async runChat(input: ChatInput): Promise<ChatResult> {
    const response = await this.client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      tools: [
        {
          name: "env_inspect",
          description: "Returns runtime information",
          input_schema: {
            type: "object",
            properties: {},
          },
        },
      ],
      messages: [
        {
          role: "user",
          content: input.message,
        },
      ],
    });

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
      toolCalls,
    };
  }
}
