import { ToolExecutor } from "./toolExecutor";
import { EnvInspectTool } from "./envInspect";

export function createToolExecutor(){

    const executor = new ToolExecutor();

    executor.register(
        new EnvInspectTool()
    );

    return executor;
}