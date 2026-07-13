import { Router } from "express";
import { AgentService } from "../agent/agentService";
import { RealPiClient } from "../agent/realPiClient";
import { ToolExecutor } from "../tools/toolExecutor";
import { EnvInspectTool } from "../tools/envInspect";
import { AgentLoop } from "../agent/agentLoop";

const router = Router();

const piClient = new RealPiClient();
const toolExecutor = new ToolExecutor();
toolExecutor.register(new EnvInspectTool());

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
