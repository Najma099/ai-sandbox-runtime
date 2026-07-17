import "dotenv/config";
import { createAppDependencies } from "./tools";

async function runStressTest() {
  const deps = createAppDependencies();
  const provider = deps.manager.getProvider();
  const concurrency = Number(process.env.STRESS_CONCURRENCY ?? 20);

  console.log(`Stress test (${provider}) with ${concurrency} concurrent jobs`);

  const commands = Array.from({ length: concurrency }, (_, index) => {
    if (index % 3 === 0) {
      return deps.executor.execute("shell_run", { command: "node --version" });
    }

    if (index % 3 === 1) {
      return deps.executor.execute("shell_run", { command: "uname -s" });
    }

    return deps.executor.execute("fs_read", { path: "/workspace/package.json" });
  });

  const start = Date.now();
  const results = await Promise.allSettled(commands);
  const elapsed = Date.now() - start;

  const fulfilled = results.filter((result) => result.status === "fulfilled");
  const rejected = results.filter((result) => result.status === "rejected");

  console.log("Completed:", fulfilled.length);
  console.log("Failed:", rejected.length);
  console.log("Elapsed ms:", elapsed);
  console.log("Scheduler status:", deps.scheduler.getStatus());

  if (rejected.length > 0) {
    console.log("First failure:", rejected[0]);
    throw new Error("Stress test had failures");
  }

  console.log("Stress test passed");
}

runStressTest().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
