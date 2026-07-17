import Anthropic from "@anthropic-ai/sdk";
import { createSandboxScheduler } from "../scheduler/createSandboxScheduler";
import { SandboxScheduler } from "../scheduler/SandboxScheduler";
import { SandboxManager } from "../sandbox/SandboxManager";
import { EnvInspectTool } from "./envInspect";
import { FsReadTool } from "./fsRead";
import { ShellRunTool } from "./shellRun";
import { Tool } from "./tool";
import { ToolExecutor } from "./toolExecutor";

export function toAnthropicTools(tools: Tool[]): Anthropic.Messages.Tool[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema as Anthropic.Messages.Tool.InputSchema,
  }));
}

export interface AppDependencies {
  executor: ToolExecutor;
  anthropicTools: Anthropic.Messages.Tool[];
  manager: SandboxManager;
  scheduler: SandboxScheduler;
}

export function createAppDependencies(): AppDependencies {
  const manager = new SandboxManager();
  const scheduler = createSandboxScheduler(manager);
  const executor = new ToolExecutor();

  const tools: Tool[] = [
    new EnvInspectTool(),
    new ShellRunTool(scheduler),
    new FsReadTool(scheduler),
  ];

  for (const tool of tools) {
    executor.register(tool);
  }

  return {
    executor,
    anthropicTools: toAnthropicTools(tools),
    manager,
    scheduler,
  };
}

export function createToolExecutor(): {
  executor: ToolExecutor;
  anthropicTools: Anthropic.Messages.Tool[];
} {
  const deps = createAppDependencies();

  return {
    executor: deps.executor,
    anthropicTools: deps.anthropicTools,
  };
}
