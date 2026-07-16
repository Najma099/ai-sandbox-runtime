import { KubernetesLeaseManager } from "../locking/KubernetesLeaseManager";
import { SandboxManager } from "../sandbox/SandboxManager";
import { SandboxScheduler, SandboxSchedulerOptions } from "./SandboxScheduler";

export function createSandboxScheduler(
  manager: SandboxManager,
  options: SandboxSchedulerOptions = {},
): SandboxScheduler {
  const sandboxes = manager.getSandboxes();
  const schedulerOptions: SandboxSchedulerOptions = { ...options };

  if (!schedulerOptions.leaseManager && manager.getProvider() === "kubernetes") {
    const namespace = process.env.K8S_NAMESPACE ?? "sandbox";
    schedulerOptions.leaseManager = new KubernetesLeaseManager({ namespace });
  }

  return new SandboxScheduler(sandboxes, schedulerOptions);
}
