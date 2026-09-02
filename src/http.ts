import { createServer } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerTools } from "./server.js";

const PORT = Number(process.env.PORT ?? 3000);

function createMcpServer() {
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
  return server;
}

const httpServer = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          name: "mcp-crypto-toolkit",
          mcp: "/mcp",
        }),
      );
      return;
    }

    if (req.url?.startsWith("/mcp")) {
      // Stateless mode: one transport+server per request
      const server = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found. Use POST /mcp or GET /health");
  } catch (error) {
    console.error("HTTP error:", error);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal server error");
    }
  }
});

httpServer.listen(PORT, () => {
  console.error(
    `mcp-crypto-toolkit HTTP listening on http://localhost:${PORT}/mcp`,
  );
});
