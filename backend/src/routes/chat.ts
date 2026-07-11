import { Router } from "express";
import { AgentService } from "../agent/agentService";
import { RealPiClient } from "../agent/realPiClient";
import { ToolExecutor } from "../tools/toolExecutor";
import { EnvInspectTool } from "../tools/envInspect";

const router = Router();

const piClient = new RealPiClient();
const toolExecutor = new ToolExecutor();

toolExecutor.register(
    new EnvInspectTool()
);

const agentService = new AgentService(piClient);

router.post("/chat", async(req,res)=>{
    const { sessionId, message } = req.body;
    const result = await agentService.chat(sessionId, message);
    res.json({sessionId, ...result});
});


export default router;