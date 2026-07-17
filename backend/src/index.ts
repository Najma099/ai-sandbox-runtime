import "dotenv/config";
import express from "express";
import { createChatRouter } from "./routes/chat";
import { createStatusRouter } from "./routes/status";
import { createAppDependencies } from "./tools";

const app = express();
const deps = createAppDependencies();

app.use(express.json());
app.use(createStatusRouter(deps));
app.use(createChatRouter(deps));

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Sandbox provider: ${deps.manager.getProvider()}`);
});

export { app, deps };
