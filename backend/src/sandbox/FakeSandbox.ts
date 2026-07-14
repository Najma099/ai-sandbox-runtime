import { Sandbox } from "./Sandbox";

export class FakeSandbox implements Sandbox {
  constructor(public readonly id: string) {}

  async execute(command: string): Promise<string> {
    const trimmed = command.trim();

    if (trimmed === "node --version") {
      return process.version;
    }

    return `[${this.id}] ${trimmed}`;
  }
}
