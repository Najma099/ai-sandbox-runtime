import { SandboxManager } from "./sandbox";
import { SandboxScheduler } from "./scheduler";

async function main() {
  const manager = new SandboxManager({ count: 3 });
  const scheduler = new SandboxScheduler(manager.getSandboxes());

  const results = await Promise.all([
    scheduler.execute("node --version"),
    scheduler.execute("node --version"),
    scheduler.execute("node --version"),
    scheduler.execute("echo hello"),
  ]);

  console.log("Results:", results);
  console.log("Free sandboxes:", scheduler.getFreeCount());
  console.log("Waiting jobs:", scheduler.getWaitingCount());
}

main().catch(console.error);
