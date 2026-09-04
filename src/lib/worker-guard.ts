/**
 * Sliding-window rate limiter using the Cache API (works across Worker isolates).
 * Returns a 429 Response when over limit, or null when allowed.
 */
export async function enforceRateLimit(
  request: Request,
  options: {
    limit?: number;
    windowSeconds?: number;
    cache?: Cache;
  } = {},
): Promise<Response | null> {
  const limit = options.limit ?? 60;
  const windowSeconds = options.windowSeconds ?? 60;
  const cache = options.cache ?? (typeof caches !== "undefined" ? caches.default : undefined);
  if (!cache) return null;

  const ip =
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
  const keyUrl = `https://mcp-crypto-toolkit.rate-limit/${encodeURIComponent(ip)}/${bucket}`;
  const key = new Request(keyUrl);

  let count = 0;
  const existing = await cache.match(key);
  if (existing) {
    count = Number.parseInt(await existing.text(), 10) || 0;
  }

  if (count >= limit) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        limit,
        window_seconds: windowSeconds,
        retry_after: windowSeconds,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(windowSeconds),
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  await cache.put(
    key,
    new Response(String(count + 1), {
      headers: {
        "Cache-Control": `max-age=${windowSeconds}`,
        "Content-Type": "text/plain",
      },
    }),
  );

  return null;
}

/** When MCP_API_KEY is set, require Bearer or x-api-key. OPTIONS/health skip this. */
export function checkApiKey(
  request: Request,
  expectedKey: string | undefined,
): Response | null {
  if (!expectedKey) return null;

  const auth = request.headers.get("Authorization");
  const bearer =
    auth?.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : undefined;
  const headerKey = request.headers.get("x-api-key")?.trim();
  const provided = bearer || headerKey;

  if (provided && provided === expectedKey) return null;

  return new Response(
    JSON.stringify({
      error: "Unauthorized",
      message: "Set Authorization: Bearer <MCP_API_KEY> or x-api-key header",
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": "Bearer",
        "Access-Control-Allow-Origin": "*",
      },
    },
  );
}
