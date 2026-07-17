import { SandboxScheduler } from "../scheduler/SandboxScheduler";
import { assertCommandAllowed } from "../sandbox/commandPolicy";
import { Tool } from "./tool";

export class ShellRunTool implements Tool {
  name = "shell_run";
  description = "Run an allow-listed shell command in an isolated sandbox pod";
  inputSchema = {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "Allow-listed shell command to execute in the sandbox",
      },
    },
    required: ["command"],
  };

  constructor(private readonly scheduler: SandboxScheduler) {}

  async executes(args: Record<string, unknown>): Promise<string> {
    const command = args.command;

    if (typeof command !== "string" || !command.trim()) {
      throw new Error("shell_run requires a non-empty command string");
    }

    assertCommandAllowed(command);
    return this.scheduler.execute(command);
  }
}
