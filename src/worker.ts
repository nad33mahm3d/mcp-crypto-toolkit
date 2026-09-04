import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "./create-server.js";
import { checkApiKey, enforceRateLimit } from "./lib/worker-guard.js";
import { SERVER_NAME, VERSION } from "./version.js";

export interface Env {
  COINGECKO_API_KEY?: string;
  COINGECKO_PRO?: string;
  MCP_API_KEY?: string;
  RATE_LIMIT_PER_MINUTE?: string;
  ETHERSCAN_API_KEY?: string;
  BSCSCAN_API_KEY?: string;
  POLYGONSCAN_API_KEY?: string;
  ARBISCAN_API_KEY?: string;
  BASESCAN_API_KEY?: string;
  OPTIMISTIC_ETHERSCAN_API_KEY?: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, accept, authorization, x-api-key, mcp-session-id, mcp-protocol-version",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
): Response {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return new Response(text, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(new TextEncoder().encode(text).byteLength),
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function isJsonRpcNotification(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const msg = value as Record<string, unknown>;
  return typeof msg.method === "string" && !("id" in msg);
}

/** Map Worker bindings onto process.env for shared tool code. */
function applyEnv(env: Env): void {
  const g = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  if (!g.process) g.process = { env: {} };
  if (!g.process.env) g.process.env = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string" && key !== "MCP_API_KEY") {
      g.process.env[key] = value;
    }
  }
}

async function handleMcp(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: { ...CORS_HEADERS, "Access-Control-Max-Age": "86400" },
    });
  }

  if (request.method === "POST") {
    let parsed: unknown;
    try {
      const raw = await request.text();
      parsed = raw ? JSON.parse(raw) : undefined;
    } catch {
      return jsonResponse(
        {
          jsonrpc: "2.0",
          error: { code: -32700, message: "Parse error" },
          id: null,
        },
        400,
      );
    }

    // Proxy-safe short-circuit for JSON-RPC notifications (empty 202 hangs on some edges).
    if (isJsonRpcNotification(parsed)) {
      return jsonResponse('{"ok":true}\n', 202);
    }

    const server = createMcpServer();
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    try {
      const response = await transport.handleRequest(request, {
        parsedBody: parsed,
      });
      return withCors(response);
    } finally {
      void transport.close();
      void server.close();
    }
  }

  const server = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    const response = await transport.handleRequest(request);
    return withCors(response);
  } finally {
    void transport.close();
    void server.close();
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    applyEnv(env);

    const path = new URL(request.url).pathname;

    if (request.method === "GET" && (path === "/" || path === "/health")) {
      return jsonResponse({
        ok: true,
        name: SERVER_NAME,
        version: VERSION,
        mcp: "/mcp",
        auth_required: Boolean(env.MCP_API_KEY),
      });
    }

    if (path === "/mcp" || path.startsWith("/mcp/")) {
      if (request.method !== "OPTIONS") {
        const unauthorized = checkApiKey(request, env.MCP_API_KEY);
        if (unauthorized) return unauthorized;

        const limit = Number.parseInt(env.RATE_LIMIT_PER_MINUTE ?? "60", 10);
        const limited = await enforceRateLimit(request, {
          limit: Number.isFinite(limit) && limit > 0 ? limit : 60,
          windowSeconds: 60,
        });
        if (limited) return limited;
      }

      try {
        return await handleMcp(request);
      } catch (error) {
        console.error("Worker MCP error:", error);
        return new Response("Internal server error", {
          status: 500,
          headers: CORS_HEADERS,
        });
      }
    }

    return new Response("Not found. Use POST /mcp or GET /health", {
      status: 404,
      headers: { "Content-Type": "text/plain", ...CORS_HEADERS },
    });
  },
};
