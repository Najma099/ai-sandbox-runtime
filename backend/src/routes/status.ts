import { Router } from "express";
import { listSandboxPods } from "../sandbox/podStatus";
import { getAllowedCommandPatterns } from "../sandbox/commandPolicy";
import { AppDependencies } from "../tools";

export function createStatusRouter(deps: AppDependencies): Router {
  const router = Router();
  const startedAt = Date.now();

  router.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
      sandbox: {
        provider: deps.manager.getProvider(),
        namespace: process.env.K8S_NAMESPACE ?? "sandbox",
        scheduler: deps.scheduler.getStatus(),
        allowedCommandPatterns: getAllowedCommandPatterns(),
      },
    });
  });

  router.get("/pods", async (_req, res) => {
    try {
      const pods = await listSandboxPods(deps.manager);
      res.json(pods);
    } catch (error) {
      res.status(503).json({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  return router;
}
