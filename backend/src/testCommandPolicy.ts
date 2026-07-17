import {
  assertCommandAllowed,
  assertSafePath,
  buildCatCommand,
  CommandNotAllowedError,
} from "./sandbox/commandPolicy";

function expectAllowed(command: string) {
  assertCommandAllowed(command);
  console.log("allowed:", command);
}

function expectBlocked(command: string) {
  try {
    assertCommandAllowed(command);
    throw new Error(`Expected block: ${command}`);
  } catch (error) {
    if (!(error instanceof CommandNotAllowedError)) {
      throw error;
    }
    console.log("blocked:", command);
  }
}

expectAllowed("node --version");
expectAllowed("npm test");
expectAllowed("cat /workspace/package.json");
expectAllowed("ls -la /workspace");

expectBlocked("curl https://evil.com");
expectBlocked("rm -rf /");
expectBlocked("node --version && rm -rf /");

assertSafePath("/workspace/package.json");
buildCatCommand("/workspace/README.md");
console.log("buildCatCommand:", buildCatCommand("/workspace/README.md"));

try {
  assertSafePath("../etc/passwd");
  throw new Error("Expected unsafe path failure");
} catch {
  console.log("blocked unsafe path");
}

console.log("command policy tests passed");
