import { buildCatCommand } from "./commandPolicy";
import { Sandbox } from "./Sandbox";

const MOCK_FILES: Record<string, string> = {
  "/workspace/package.json": JSON.stringify(
    { name: "sandbox-workspace", version: "1.0.0" },
    null,
    2,
  ),
  "/workspace/README.md": "# Sandbox Workspace\n\nFake sandbox file for local development.\n",
};

export class FakeSandbox implements Sandbox {
  constructor(public readonly id: string) {}

  async execute(
    command: string,
    _options?: { timeoutMs?: number },
  ): Promise<string> {
    const trimmed = command.trim();

    if (trimmed === "node --version") {
      return process.version;
    }

    if (trimmed.startsWith("cat ")) {
      const path = trimmed.slice(4).replace(/^'|'$/g, "").replace(/'\\''/g, "'");
      return MOCK_FILES[path] ?? `cat: ${path}: No such file or directory`;
    }

    if (trimmed === "uname -s") {
      return process.platform === "darwin" ? "Darwin" : process.platform;
    }

    return `[${this.id}] ${trimmed}`;
  }

  readMockPath(path: string): string | undefined {
    return MOCK_FILES[path];
  }
}

export function buildFakeReadCommand(path: string): string {
  return buildCatCommand(path);
}
