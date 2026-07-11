import { Tool } from "./tool";

export class EnvInspectTool implements Tool {

    name = "env_inspect";
    description = "Return runtime information";

    async executes() {
        return JSON.stringify({

            os: process.platform,

            node:
            process.version

        });
    }

}