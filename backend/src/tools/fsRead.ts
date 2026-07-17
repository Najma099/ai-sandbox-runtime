import { SandboxScheduler } from "../scheduler/SandboxScheduler";
import { buildCatCommand } from "../sandbox/commandPolicy";
import { Tool } from "./tool";

export class FsReadTool implements Tool {
  name = "fs_read";
  description = "Read a text file from the sandbox filesystem";
  inputSchema = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Absolute path to the file inside the sandbox",
      },
    },
    required: ["path"],
  };

  constructor(private readonly scheduler: SandboxScheduler) {}

  async executes(args: Record<string, unknown>): Promise<string> {
    const path = args.path;

    if (typeof path !== "string" || !path.trim()) {
      throw new Error("fs_read requires a non-empty path string");
    }

    const command = buildCatCommand(path);
    return this.scheduler.execute(command);
  }
}
