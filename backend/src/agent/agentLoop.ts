import { PiClient } from "./PiClient";
import { ToolExecutor } from "../tools/toolExecutor";
import { ChatResult } from "./types";

export class AgentLoop {
  constructor(
    private piClient: PiClient,
    private toolExecutor: ToolExecutor,
  ) {}

  async run(sessionId: string, message: string): Promise<ChatResult> {
    let response = await this.piClient.startChat({
      sessionId,
      message,
    });

    while (response.toolCalls?.length) {
      const toolResults = [];

      for (const toolCall of response.toolCalls) {
        console.log("Executing tool:", toolCall.tool);

        const result = await this.toolExecutor.execute(
          toolCall.tool,
          toolCall.arguments,
        );

        console.log("Tool result:", result);

        toolResults.push({
          toolCallId: toolCall.toolCallId,
          result,
        });
      }

      response = await this.piClient.continueChat({
        sessionId,
        toolResults,
      });
    }

    return response;
  }
}
