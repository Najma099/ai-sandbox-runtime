import { Router } from "express";
import { AgentService } from "../agent/agentService";
import { RealPiClient } from "../agent/realPiClient";
import { AgentLoop } from "../agent/agentLoop";
import { createToolExecutor } from "../tools";

const router = Router();

const { executor: toolExecutor, anthropicTools } = createToolExecutor();
const piClient = new RealPiClient(anthropicTools);
const agentLoop = new AgentLoop(piClient, toolExecutor);
const agentService = new AgentService(agentLoop);

router.post("/chat", async (req, res) => {
  const { sessionId, message } = req.body;

  const result = await agentService.chat(sessionId, message);

  res.json({
    sessionId,
    ...result,
  });
});

export default router;
