import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./server.js";

const server = new Server(
  {
    name: "mcp-crypto-toolkit",
    version: "1.1.0",
    description:
      "Live crypto prices, conversion, gas tracker, portfolio tools and calculators for AI agents",
  },
  { capabilities: { tools: {}, prompts: {} } },
);

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
