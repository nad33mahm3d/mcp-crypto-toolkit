import { createServer, type IncomingMessage } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./create-server.js";
import { SERVER_NAME, VERSION } from "./version.js";

const PORT = Number(process.env.PORT ?? 3000);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, accept, mcp-session-id, mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id",
} as const;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function isJsonRpcNotification(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const msg = value as Record<string, unknown>;
  return typeof msg.method === "string" && !("id" in msg);
}

const httpServer = createServer(async (req, res) => {
  try {
    const path = req.url?.split("?")[0] ?? "/";

    if (req.method === "OPTIONS" && path.startsWith("/mcp")) {
      res.writeHead(204, {
        ...CORS_HEADERS,
        "Access-Control-Max-Age": "86400",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && (path === "/" || path === "/health")) {
      const body = JSON.stringify({
        ok: true,
        name: SERVER_NAME,
        version: VERSION,
        mcp: "/mcp",
      });
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        ...CORS_HEADERS,
      });
      res.end(body);
      return;
    }

    if (path.startsWith("/mcp")) {
      // Proxy-safe short-circuit for JSON-RPC notifications (e.g. notifications/initialized).
      // Some hosts (Cloudflare / MCP Hosting) hang on empty HTTP 202 bodies from the SDK,
      // which leaves Claude.ai Custom Connectors "connected" with 0 tools.
      if (req.method === "POST") {
        const raw = await readBody(req);
        let parsed: unknown;
        try {
          parsed = raw ? JSON.parse(raw) : undefined;
        } catch {
          const errBody = JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32700, message: "Parse error" },
            id: null,
          });
          res.writeHead(400, {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(errBody),
            ...CORS_HEADERS,
          });
          res.end(errBody);
          return;
        }

        if (isJsonRpcNotification(parsed)) {
          // Non-empty body + explicit length so reverse proxies flush the response.
          const body = '{"ok":true}\n';
          res.writeHead(202, {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
            ...CORS_HEADERS,
          });
          res.end(body);
          return;
        }

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
        await transport.handleRequest(req, res, parsed);
        return;
      }

      // Stateless mode: one transport+server per request (GET SSE, etc.)
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

    res.writeHead(404, { "Content-Type": "text/plain", ...CORS_HEADERS });
    res.end("Not found. Use POST /mcp or GET /health");
  } catch (error) {
    console.error("HTTP error:", error);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain", ...CORS_HEADERS });
      res.end("Internal server error");
    }
  }
});

httpServer.listen(PORT, () => {
  console.error(
    `mcp-crypto-toolkit HTTP listening on http://localhost:${PORT}/mcp`,
  );
});
