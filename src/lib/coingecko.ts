import { COIN_MAP, USER_AGENT } from "./constants.js";
import { priceCache, historicalCache, TTL } from "./cache.js";

export class CoinGeckoError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "CoinGeckoError";
  }
}

export function resolveCoinId(input: string): string {
  const normalized = input.toLowerCase().trim();
  return COIN_MAP[normalized] ?? normalized;
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = 3,
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
          ...(options.headers ?? {}),
        },
      });

      if (response.status === 429) {
        const waitMs = Math.min(1000 * 2 ** attempt, 8000);
        if (attempt < retries - 1) {
          await sleep(waitMs);
          continue;
        }
        throw new CoinGeckoError(
          "CoinGecko rate limit exceeded (429). Please try again in a few seconds.",
          429,
          true,
        );
      }

      if (!response.ok) {
        throw new CoinGeckoError(
          `CoinGecko API error: ${response.status} ${response.statusText}`,
          response.status,
        );
      }

      return response;
    } catch (error) {
      if (error instanceof CoinGeckoError) throw error;
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries - 1) {
        await sleep(1000 * 2 ** attempt);
      }
    }
  }

  throw lastError ?? new Error("Fetch failed after retries");
}

export interface SimplePriceResult {
  id: string;
  price: number;
  change24h?: number;
  lastUpdated?: string;
}

export async function getSimplePrice(
  ids: string[],
  vsCurrencies: string[],
): Promise<Record<string, Record<string, number>>> {
  const uniqueIds = [...new Set(ids.map(resolveCoinId))];
  const uniqueVs = [...new Set(vsCurrencies.map((v) => v.toLowerCase()))];
  const cacheKey = `simple:${uniqueIds.sort().join(",")}:${uniqueVs.sort().join(",")}`;

  const cached = priceCache.get<Record<string, Record<string, number>>>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    ids: uniqueIds.join(","),
    vs_currencies: uniqueVs.join(","),
    include_24hr_change: "true",
    include_last_updated_at: "true",
  });

  const response = await fetchWithRetry(
    `https://api.coingecko.com/api/v3/simple/price?${params}`,
  );
  const data = (await response.json()) as Record<
    string,
    Record<string, number | string>
  >;

  priceCache.set(cacheKey, data, TTL.PRICE);
  return data as Record<string, Record<string, number>>;
}

export async function getCoinPrice(
  coin: string,
  vsCurrency: string,
): Promise<SimplePriceResult> {
  const id = resolveCoinId(coin);
  const vs = vsCurrency.toLowerCase();
  const data = await getSimplePrice([id], [vs]);

  const coinData = data[id];
  if (!coinData) {
    throw new CoinGeckoError(`Coin not found: ${coin} (id: ${id})`);
  }

  const price = coinData[vs];
  if (price === undefined) {
    throw new CoinGeckoError(`Currency not supported: ${vsCurrency}`);
  }

  const changeKey = `${vs}_24h_change`;
  const lastUpdatedKey = "last_updated_at";

  return {
    id,
    price: Number(price),
    change24h: coinData[changeKey] !== undefined ? Number(coinData[changeKey]) : undefined,
    lastUpdated:
      coinData[lastUpdatedKey] !== undefined
        ? new Date(Number(coinData[lastUpdatedKey]) * 1000).toISOString()
        : new Date().toISOString(),
  };
}

export interface HistoricalPriceResult {
  id: string;
  date: string;
  price: number;
  vsCurrency: string;
}

export async function getHistoricalPrice(
  coin: string,
  date: string,
  vsCurrency: string,
): Promise<HistoricalPriceResult> {
  const id = resolveCoinId(coin);
  const vs = vsCurrency.toLowerCase();
  const cacheKey = `hist:${id}:${date}:${vs}`;

  const cached = historicalCache.get<HistoricalPriceResult>(cacheKey);
  if (cached) return cached;

  const response = await fetchWithRetry(
    `https://api.coingecko.com/api/v3/coins/${id}/history?date=${encodeURIComponent(date)}&localization=false`,
  );
  const data = (await response.json()) as {
    market_data?: { current_price?: Record<string, number> };
    error?: string;
  };

  if (data.error || !data.market_data?.current_price?.[vs]) {
    throw new CoinGeckoError(
      data.error ?? `Historical price not found for ${coin} on ${date}`,
    );
  }

  const result: HistoricalPriceResult = {
    id,
    date,
    price: data.market_data.current_price[vs],
    vsCurrency: vs,
  };

  historicalCache.set(cacheKey, result, TTL.HISTORICAL);
  return result;
}

export async function getCurrentPriceForComparison(
  coin: string,
  vsCurrency: string,
): Promise<number> {
  const result = await getCoinPrice(coin, vsCurrency);
  return result.price;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatNumber(value: number, decimals = 2): number {
  return Number(value.toFixed(decimals));
}

export function formatPercent(value: number, decimals = 2): number {
  return Number(value.toFixed(decimals));
}
