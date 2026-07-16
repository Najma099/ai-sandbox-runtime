import { SandboxScheduler } from "../scheduler/SandboxScheduler";
import { Tool } from "./tool";

export class ShellRunTool implements Tool {
  name = "shell_run";
  description = "Run a shell command in an isolated sandbox pod";
  inputSchema = {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "Shell command to execute in the sandbox",
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

    return this.scheduler.execute(command);
  }
}
