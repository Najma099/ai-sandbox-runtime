import { AgentLoop } from "./agentLoop";

export class AgentService {
  constructor(private readonly agentLoop: AgentLoop) {}

  async chat(sessionId: string, message: string) {
    return this.agentLoop.run(sessionId, message);
  }
}
