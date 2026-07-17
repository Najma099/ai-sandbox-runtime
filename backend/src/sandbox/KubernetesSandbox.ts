import { spawn, ChildProcess } from "node:child_process";
import { Sandbox } from "./Sandbox";

export class KubernetesSandbox implements Sandbox {
  constructor(
    public readonly id: string,
    private readonly namespace: string,
  ) {}

  async execute(
    command: string,
    options?: { timeoutMs?: number },
  ): Promise<string> {
    const trimmed = command.trim();

    if (!trimmed) {
      throw new Error("Command must not be empty");
    }

    const { stdout, stderr, exitCode } = await kubectlExec(
      this.id,
      this.namespace,
      trimmed,
      options?.timeoutMs,
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
  timeoutMs?: number,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    let proc: ChildProcess | undefined;
    let timer: NodeJS.Timeout | undefined;

    proc = spawn(
      "kubectl",
      ["exec", "-n", namespace, pod, "--", "sh", "-c", command],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result: { stdout: string; stderr: string; exitCode: number }) => {
      if (settled) {
        return;
      }

      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      resolve(result);
    };

    const fail = (error: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      proc?.kill("SIGKILL");
      reject(error);
    };

    if (timeoutMs) {
      timer = setTimeout(() => {
        fail(new Error(`Execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }

    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("error", (error) => {
      fail(error);
    });

    proc.on("close", (exitCode) => {
      finish({
        stdout,
        stderr,
        exitCode: exitCode ?? 1,
      });
    });
  });
}
