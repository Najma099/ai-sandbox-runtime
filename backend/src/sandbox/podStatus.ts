import { spawn } from "node:child_process";
import { SandboxManager } from "./SandboxManager";
import { SandboxProvider } from "./SandboxManager";

export interface PodStatus {
  id: string;
  phase: string;
  ready: boolean;
  restarts: number;
}

export interface PodListResponse {
  provider: SandboxProvider;
  namespace: string;
  pods: PodStatus[];
}

export async function listSandboxPods(
  manager: SandboxManager,
): Promise<PodListResponse> {
  const provider = manager.getProvider();
  const namespace = process.env.K8S_NAMESPACE ?? "sandbox";
  const sandboxes = manager.getSandboxes();

  if (provider === "fake") {
    return {
      provider,
      namespace,
      pods: sandboxes.map((sandbox) => ({
        id: sandbox.id,
        phase: "Running",
        ready: true,
        restarts: 0,
      })),
    };
  }

  const raw = await kubectlGetPods(namespace);
  const podsByName = new Map(raw.map((pod) => [pod.id, pod]));

  return {
    provider,
    namespace,
    pods: sandboxes.map((sandbox) => {
      const live = podsByName.get(sandbox.id);

      return live ?? {
        id: sandbox.id,
        phase: "Unknown",
        ready: false,
        restarts: 0,
      };
    }),
  };
}

function kubectlGetPods(namespace: string): Promise<PodStatus[]> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "kubectl",
      [
        "get",
        "pods",
        "-n",
        namespace,
        "-l",
        "app=sandbox-runner",
        "-o",
        "json",
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", reject);

    proc.on("close", (exitCode) => {
      if (exitCode !== 0) {
        reject(new Error(stderr.trim() || `kubectl get pods failed with ${exitCode}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as {
          items: Array<{
            metadata: { name: string };
            status: {
              phase?: string;
              containerStatuses?: Array<{ ready?: boolean; restartCount?: number }>;
            };
          }>;
        };

        resolve(
          parsed.items.map((item) => ({
            id: item.metadata.name,
            phase: item.status.phase ?? "Unknown",
            ready: item.status.containerStatuses?.[0]?.ready ?? false,
            restarts: item.status.containerStatuses?.[0]?.restartCount ?? 0,
          })),
        );
      } catch (error) {
        reject(error);
      }
    });
  });
}
