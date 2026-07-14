import { spawn } from "node:child_process";
import { Sandbox } from "./Sandbox";

export class KubernetesSandbox implements Sandbox {
  constructor(
    public readonly id: string,
    private readonly namespace: string,
  ) {}

  async execute(command: string): Promise<string> {
    const trimmed = command.trim();

    if (!trimmed) {
      throw new Error("Command must not be empty");
    }

    const { stdout, stderr, exitCode } = await kubectlExec(
      this.id,
      this.namespace,
      trimmed,
    );

    if (exitCode !== 0) {
      throw new Error(
        stderr.trim() || stdout.trim() || `kubectl exec failed with exit code ${exitCode}`,
      );
    }

    return stdout.trim();
  }
}

function kubectlExec(
  pod: string,
  namespace: string,
  command: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "kubectl",
      ["exec", "-n", namespace, pod, "--", "sh", "-c", command],
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

    proc.on("error", (error) => {
      reject(error);
    });

    proc.on("close", (exitCode) => {
      resolve({
        stdout,
        stderr,
        exitCode: exitCode ?? 1,
      });
    });
  });
}
