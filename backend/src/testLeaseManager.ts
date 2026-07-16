import "dotenv/config";
import { FakeLeaseManager } from "./locking/FakeLeaseManager";
import { KubernetesLeaseManager } from "./locking/KubernetesLeaseManager";

async function testFakeLeaseRace() {
  const leaseManager = new FakeLeaseManager();

  const api1 = await leaseManager.tryAcquire("sandbox-runner-0", "API-1-request123");
  const api2 = await leaseManager.tryAcquire("sandbox-runner-0", "API-2-request456");

  console.log("Fake lease race:");
  console.log("  API-1 acquire:", api1);
  console.log("  API-2 acquire:", api2);

  if (!api1 || api2) {
    throw new Error("Expected API-1 to win and API-2 to fail");
  }

  await leaseManager.release("sandbox-runner-0", "API-1-request123");

  const api2Retry = await leaseManager.tryAcquire(
    "sandbox-runner-0",
    "API-2-request456",
  );

  console.log("  API-2 acquire after release:", api2Retry);

  if (!api2Retry) {
    throw new Error("Expected API-2 to acquire after release");
  }

  await leaseManager.release("sandbox-runner-0", "API-2-request456");
}

async function testKubernetesLeaseRace() {
  const namespace = process.env.K8S_NAMESPACE ?? "sandbox";
  const leaseManager = new KubernetesLeaseManager({ namespace });

  console.log("\nKubernetes lease race on sandbox-runner-0:");

  const api1 = await leaseManager.tryAcquire("sandbox-runner-0", "API-1-request123");
  const api2 = await leaseManager.tryAcquire("sandbox-runner-0", "API-2-request456");

  console.log("  API-1 acquire:", api1);
  console.log("  API-2 acquire:", api2);

  if (!api1 || api2) {
    throw new Error("Expected API-1 to win and API-2 to fail");
  }

  await leaseManager.release("sandbox-runner-0", "API-1-request123");

  const api2Retry = await leaseManager.tryAcquire(
    "sandbox-runner-0",
    "API-2-request456",
  );

  console.log("  API-2 acquire after release:", api2Retry);

  if (!api2Retry) {
    throw new Error("Expected API-2 to acquire after release");
  }

  await leaseManager.release("sandbox-runner-0", "API-2-request456");
}

async function main() {
  await testFakeLeaseRace();

  if (process.env.SKIP_K8S_LEASE_TEST === "1") {
    console.log("\nSkipping Kubernetes lease test (SKIP_K8S_LEASE_TEST=1)");
    return;
  }

  await testKubernetesLeaseRace();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
