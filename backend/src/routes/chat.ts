import { Router } from "express";
import { AgentService } from "../agent/agentService";
import { RealPiClient } from "../agent/realPiClient";
import { AgentLoop } from "../agent/agentLoop";
import { AppDependencies } from "../tools";

export function createChatRouter(deps: AppDependencies): Router {
  const router = Router();
  const piClient = new RealPiClient(deps.anthropicTools);
  const agentLoop = new AgentLoop(piClient, deps.executor);
  const agentService = new AgentService(agentLoop);

  router.post("/chat", async (req, res) => {
    const { sessionId, message } = req.body;

    const result = await agentService.chat(sessionId, message);

    res.json({
      sessionId,
      ...result,
    });
  });

  return router;
}
