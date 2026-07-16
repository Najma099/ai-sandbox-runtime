import { Tool } from "./tool";

export class ToolExecutor {
    private tools = new Map<string, Tool>();

    register(tool: Tool){
        this.tools.set(
            tool.name,
            tool
        );
    }

    async execute(
        name:string,
        args:Record<string, unknown>
    ){
        const tool = this.tools.get(name);

        if(!tool){
            throw new Error(
                `Tool ${name} not found`
            );
        }
        return tool.executes(args);
    }
}