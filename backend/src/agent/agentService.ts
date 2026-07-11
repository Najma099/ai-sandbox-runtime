import { PiClient } from "./PiClient";

export class AgentService {
    constructor(
        private readonly piClient: PiClient
    ){}

    async chat(
        sessionId: string,
        message: string
    ){
        return this.piClient.runChat({
            sessionId,
            message
        });
    }

}