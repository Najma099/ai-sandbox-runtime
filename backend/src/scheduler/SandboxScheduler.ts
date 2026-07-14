import { Sandbox } from "../sandbox/Sandbox";
import { Queue } from "./Queue";

type PendingJob = {
  command: string;
  resolve: (result: string) => void;
  reject: (error: Error) => void;
};

export class SandboxScheduler {
  private freeSandboxes: Sandbox[];
  private waiting = new Queue<PendingJob>();

  constructor(sandboxes: Sandbox[]) {
    if (sandboxes.length === 0) {
      throw new Error("SandboxScheduler requires at least one sandbox");
    }

    this.freeSandboxes = [...sandboxes];
  }

  async execute(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.enqueueJob({ command, resolve, reject });
    });
  }

  getFreeCount(): number {
    return this.freeSandboxes.length;
  }

  getWaitingCount(): number {
    return this.waiting.size();
  }

  private enqueueJob(job: PendingJob): void {
    const sandbox = this.freeSandboxes.shift();

    if (sandbox) {
      void this.runOnSandbox(sandbox, job);
      return;
    }

    this.waiting.enqueue(job);
  }

  private async runOnSandbox(sandbox: Sandbox, job: PendingJob): Promise<void> {
    try {
      const result = await sandbox.execute(job.command);
      job.resolve(result);
    } catch (error) {
      job.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.releaseSandbox(sandbox);
    }
  }

  private releaseSandbox(sandbox: Sandbox): void {
    const nextJob = this.waiting.dequeue();

    if (nextJob) {
      void this.runOnSandbox(sandbox, nextJob);
      return;
    }

    this.freeSandboxes.push(sandbox);
  }
}
