import { randomUUID } from "node:crypto";
import { hostname } from "node:os";
import { LeaseManager } from "../locking/LeaseManager";
import { executeWithTimeout } from "../sandbox/executeWithTimeout";
import { Sandbox } from "../sandbox/Sandbox";
import { Queue } from "./Queue";

type PendingJob = {
  command: string;
  enqueuedAt: number;
  resolve: (result: string) => void;
  reject: (error: Error) => void;
  queueTimer?: NodeJS.Timeout;
};

export interface SandboxSchedulerOptions {
  leaseManager?: LeaseManager;
  instanceId?: string;
  executionTimeoutMs?: number;
  queueTimeoutMs?: number;
}

export interface SchedulerStatus {
  totalSandboxes: number;
  freeSandboxes: number;
  busySandboxes: number;
  waitingJobs: number;
  usesLeases: boolean;
  executionTimeoutMs: number;
  queueTimeoutMs: number;
}

function parseTimeout(
  value: string | undefined,
  fallback: number,
): number {
  const parsed = Number(value);

  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
}

export class SandboxScheduler {
  private freeSandboxes: Sandbox[];
  private waiting = new Queue<PendingJob>();
  private leaseManager?: LeaseManager;
  private instanceId: string;
  private busyCount = 0;
  private executionTimeoutMs: number;
  private queueTimeoutMs: number;

  constructor(
    private sandboxes: Sandbox[],
    options: SandboxSchedulerOptions = {},
  ) {
    if (sandboxes.length === 0) {
      throw new Error("SandboxScheduler requires at least one sandbox");
    }

    this.leaseManager = options.leaseManager;
    this.instanceId = options.instanceId ?? process.env.API_INSTANCE_ID ?? hostname();
    this.executionTimeoutMs = options.executionTimeoutMs
      ?? parseTimeout(process.env.SANDBOX_EXECUTION_TIMEOUT_MS, 30_000);
    this.queueTimeoutMs = options.queueTimeoutMs
      ?? parseTimeout(process.env.SANDBOX_QUEUE_TIMEOUT_MS, 60_000);
    this.freeSandboxes = this.leaseManager ? [] : [...sandboxes];
  }

  async execute(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const job: PendingJob = {
        command,
        enqueuedAt: Date.now(),
        resolve,
        reject,
      };

      job.queueTimer = setTimeout(() => {
        this.removeWaitingJob(job);
        reject(new Error(`Queue timed out after ${this.queueTimeoutMs}ms`));
      }, this.queueTimeoutMs);

      this.enqueueJob(job);
    });
  }

  getStatus(): SchedulerStatus {
    const busySandboxes = this.leaseManager
      ? this.busyCount
      : this.sandboxes.length - this.freeSandboxes.length;

    return {
      totalSandboxes: this.sandboxes.length,
      freeSandboxes: this.getFreeCount(),
      busySandboxes,
      waitingJobs: this.getWaitingCount(),
      usesLeases: this.usesLeases(),
      executionTimeoutMs: this.executionTimeoutMs,
      queueTimeoutMs: this.queueTimeoutMs,
    };
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

  private clearQueueTimer(job: PendingJob): void {
    if (job.queueTimer) {
      clearTimeout(job.queueTimer);
      job.queueTimer = undefined;
    }
  }

  private removeWaitingJob(target: PendingJob): void {
    const remaining: PendingJob[] = [];

    while (!this.waiting.isEmpty()) {
      const job = this.waiting.dequeue();

      if (!job) {
        break;
      }

      if (job !== target) {
        remaining.push(job);
      } else {
        this.clearQueueTimer(job);
      }
    }

    for (const job of remaining) {
      this.waiting.enqueue(job);
    }
  }

  private async runSandboxCommand(
    sandbox: Sandbox,
    command: string,
  ): Promise<string> {
    return executeWithTimeout(
      sandbox,
      command,
      this.executionTimeoutMs,
    );
  }

  private async runOnSandbox(sandbox: Sandbox, job: PendingJob): Promise<void> {
    this.clearQueueTimer(job);

    try {
      const result = await this.runSandboxCommand(sandbox, job.command);
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
    this.clearQueueTimer(job);
    this.busyCount += 1;

    try {
      const result = await this.runSandboxCommand(sandbox, job.command);
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

      if (Date.now() - job.enqueuedAt >= this.queueTimeoutMs) {
        this.clearQueueTimer(job);
        job.reject(new Error(`Queue timed out after ${this.queueTimeoutMs}ms`));
        continue;
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
