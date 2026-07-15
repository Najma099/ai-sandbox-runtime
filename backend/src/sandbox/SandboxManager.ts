import { FakeSandbox } from "./FakeSandbox";
import { KubernetesSandbox } from "./KubernetesSandbox";
import { Sandbox } from "./Sandbox";

export type SandboxProvider = "fake" | "kubernetes";

export interface SandboxManagerOptions {
  count?: number;
  provider?: SandboxProvider;
  namespace?: string;
}

function resolveProvider(
  provider?: SandboxProvider,
): SandboxProvider {
  const fromEnv = process.env.SANDBOX_PROVIDER;

  if (provider) {
    return provider;
  }

  if (fromEnv === "kubernetes" || fromEnv === "fake") {
    return fromEnv;
  }

  return "fake";
}

export class SandboxManager {
  private sandboxes: Sandbox[] = [];

  constructor(options: SandboxManagerOptions = {}) {
    const count = options.count ?? 8;
    const provider = resolveProvider(options.provider);
    const namespace = options.namespace ?? process.env.K8S_NAMESPACE ?? "sandbox";

    for (let i = 0; i < count; i++) {
      const id = `sandbox-runner-${i}`;

      if (provider === "kubernetes") {
        this.sandboxes.push(new KubernetesSandbox(id, namespace));
      } else {
        this.sandboxes.push(new FakeSandbox(id));
      }
    }
  }

  getSandboxes(): Sandbox[] {
    return [...this.sandboxes];
  }

  getById(id: string): Sandbox | undefined {
    return this.sandboxes.find((sandbox) => sandbox.id === id);
  }

  getProvider(): SandboxProvider {
    const first = this.sandboxes[0];
    return first instanceof KubernetesSandbox ? "kubernetes" : "fake";
  }
}
