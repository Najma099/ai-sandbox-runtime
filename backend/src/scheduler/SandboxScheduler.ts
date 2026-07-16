import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { LeaseManager } from "../locking/LeaseManager";
import { Sandbox } from "../sandbox/Sandbox";
import { Queue } from "./Queue";

type PendingJob = {
  command: string;
  resolve: (result: string) => void;
  reject: (error: Error) => void;
};

export interface SandboxSchedulerOptions {
  leaseManager?: LeaseManager;
  instanceId?: string;
}

export class SandboxScheduler {
  private freeSandboxes: Sandbox[];
  private waiting = new Queue<PendingJob>();
  private leaseManager?: LeaseManager;
  private instanceId: string;
  private busyCount = 0;

  constructor(
    private sandboxes: Sandbox[],
    options: SandboxSchedulerOptions = {},
  ) {
    if (sandboxes.length === 0) {
      throw new Error("SandboxScheduler requires at least one sandbox");
    }

    this.leaseManager = options.leaseManager;
    this.instanceId = options.instanceId ?? process.env.API_INSTANCE_ID ?? hostname();
    this.freeSandboxes = this.leaseManager ? [] : [...sandboxes];
  }

  async execute(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.enqueueJob({ command, resolve, reject });
    });
  }

  getFreeCount(): number {
    if (this.leaseManager) {
      return Math.max(0, this.sandboxes.length - this.busyCount);
    }

    return this.freeSandboxes.length;
  }

  getWaitingCount(): number {
    return this.waiting.size();
  }

  usesLeases(): boolean {
    return Boolean(this.leaseManager);
  }

  private enqueueJob(job: PendingJob): void {
    if (this.leaseManager) {
      void this.tryAssignWithLease(job);
      return;
    }

    const sandbox = this.freeSandboxes.shift();

    if (sandbox) {
      void this.runOnSandbox(sandbox, job);
      return;
    }

    this.waiting.enqueue(job);
  }

  private async tryAssignWithLease(job: PendingJob): Promise<void> {
    const holder = this.createHolder();
    const sandbox = await this.tryAcquireSandbox(holder);

    if (sandbox) {
      await this.runOnSandboxWithLease(sandbox, job, holder);
      return;
    }

    this.waiting.enqueue(job);
  }

  private async tryAcquireSandbox(holder: string): Promise<Sandbox | null> {
    for (const sandbox of this.sandboxes) {
      if (await this.leaseManager!.tryAcquire(sandbox.id, holder)) {
        return sandbox;
      }
    }

    return null;
  }

  private createHolder(): string {
    return `${this.instanceId}-${randomUUID()}`;
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

  private async runOnSandboxWithLease(
    sandbox: Sandbox,
    job: PendingJob,
    holder: string,
  ): Promise<void> {
    this.busyCount += 1;

    try {
      const result = await sandbox.execute(job.command);
      job.resolve(result);
    } catch (error) {
      job.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      await this.leaseManager!.release(sandbox.id, holder);
      this.busyCount -= 1;
      await this.processWaitingJobs();
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

  private async processWaitingJobs(): Promise<void> {
    while (!this.waiting.isEmpty()) {
      const job = this.waiting.dequeue();

      if (!job) {
        return;
      }

      const holder = this.createHolder();
      const sandbox = await this.tryAcquireSandbox(holder);

      if (!sandbox) {
        this.waiting.enqueue(job);
        return;
      }

      void this.runOnSandboxWithLease(sandbox, job, holder);
    }
  }
}
