import "dotenv/config";
import { KubernetesSandbox } from "./sandbox/KubernetesSandbox";
import { SandboxManager } from "./sandbox/SandboxManager";
import { SandboxScheduler } from "./scheduler/SandboxScheduler";

async function main() {
  const namespace = process.env.K8S_NAMESPACE ?? "default";
  const pod = process.env.K8S_POD ?? "sandbox-runner-0";

  console.log(`Testing kubectl exec on pod ${pod} in namespace ${namespace}`);

  const sandbox = new KubernetesSandbox(pod, namespace);
  const nodeVersion = await sandbox.execute("node --version");

  console.log("Direct execute:", nodeVersion);

  const manager = new SandboxManager({
    count: 1,
    provider: "kubernetes",
    namespace,
  });

  const scheduler = new SandboxScheduler(manager.getSandboxes());
  const scheduled = await scheduler.execute("node --version");

  console.log("Via scheduler:", scheduled);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
