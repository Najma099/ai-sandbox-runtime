import { Sandbox } from "./Sandbox";

export interface SandboxExecuteOptions {
  timeoutMs?: number;
}

export function executeWithTimeout(
  sandbox: Sandbox,
  command: string,
  timeoutMs: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    sandbox
      .execute(command, { timeoutMs })
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}
