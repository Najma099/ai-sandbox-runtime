import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

async function main() {
    const models = await client.models.list();

    for await (const model of models) {
        console.log(model.id);
    }
}

main();