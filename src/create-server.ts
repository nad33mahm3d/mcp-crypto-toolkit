import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerTools } from "./server.js";
import { SERVER_DESCRIPTION, SERVER_NAME, VERSION } from "./version.js";

export function createMcpServer(): Server {
  const server = new Server(
    {
      name: SERVER_NAME,
      version: VERSION,
      description: SERVER_DESCRIPTION,
    },
    { capabilities: { tools: {}, prompts: {} } },
  );
  registerTools(server);
  return server;
}
