import { COIN_MAP, USER_AGENT } from "./constants.js";
import { priceCache, historicalCache, TTL } from "./cache.js";

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

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

function authHeaders(): Record<string, string> {
  const key = process.env.COINGECKO_API_KEY?.trim();
  if (!key) return {};
  // Demo keys use x-cg-demo-api-key; Pro keys use x-cg-pro-api-key
  if (key.startsWith("CG-") && process.env.COINGECKO_PRO === "1") {
    return { "x-cg-pro-api-key": key };
  }
  return { "x-cg-demo-api-key": key };
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
          ...authHeaders(),
          ...(options.headers ?? {}),
        },
      });

      if (response.status === 429) {
        const waitMs = Math.min(1000 * 2 ** attempt, 10_000);
        if (attempt < retries - 1) {
          await sleep(waitMs);
          continue;
        }
        throw new CoinGeckoError(
          "CoinGecko rate limit exceeded (429). Wait a few seconds, or set COINGECKO_API_KEY for higher limits.",
          429,
          true,
        );
      }

      if (!response.ok) {
        throw new CoinGeckoError(
          `CoinGecko API error: ${response.status} ${response.statusText}`,
          response.status,
          response.status >= 500,
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

export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number | null;
  market_cap_rank: number | null;
  total_volume: number | null;
  high_24h: number | null;
  low_24h: number | null;
  price_change_percentage_24h: number | null;
  ath: number | null;
  ath_change_percentage: number | null;
  atl: number | null;
  last_updated: string | null;
}

export interface SearchCoinResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
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
    `${COINGECKO_BASE}/simple/price?${params}`,
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
    change24h:
      coinData[changeKey] !== undefined ? Number(coinData[changeKey]) : undefined,
    lastUpdated:
      coinData[lastUpdatedKey] !== undefined
        ? new Date(Number(coinData[lastUpdatedKey]) * 1000).toISOString()
        : new Date().toISOString(),
  };
}

export async function getMarkets(
  vsCurrency: string,
  options: {
    ids?: string[];
    perPage?: number;
    page?: number;
    order?: string;
    sparkline?: boolean;
  } = {},
): Promise<MarketCoin[]> {
  const vs = vsCurrency.toLowerCase();
  const perPage = options.perPage ?? 10;
  const page = options.page ?? 1;
  const order = options.order ?? "market_cap_desc";
  const ids = options.ids?.map(resolveCoinId);

  const cacheKey = `markets:${vs}:${ids?.sort().join(",") ?? "all"}:${perPage}:${page}:${order}`;
  const cached = priceCache.get<MarketCoin[]>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    vs_currency: vs,
    order,
    per_page: String(perPage),
    page: String(page),
    sparkline: "false",
    price_change_percentage: "24h",
  });
  if (ids?.length) params.set("ids", ids.join(","));

  const response = await fetchWithRetry(
    `${COINGECKO_BASE}/coins/markets?${params}`,
  );
  const data = (await response.json()) as MarketCoin[];
  priceCache.set(cacheKey, data, TTL.PRICE);
  return data;
}

export async function getRichCoinPrice(
  coin: string,
  vsCurrency: string,
): Promise<MarketCoin> {
  const id = resolveCoinId(coin);
  const markets = await getMarkets(vsCurrency, { ids: [id], perPage: 1 });
  const row = markets[0];
  if (!row) {
    throw new CoinGeckoError(`Coin not found: ${coin} (id: ${id})`);
  }
  return row;
}

export async function searchCoins(
  query: string,
  limit = 10,
): Promise<SearchCoinResult[]> {
  const q = query.trim();
  if (!q) return [];

  const cacheKey = `search:${q.toLowerCase()}:${limit}`;
  const cached = priceCache.get<SearchCoinResult[]>(cacheKey);
  if (cached) return cached;

  const response = await fetchWithRetry(
    `${COINGECKO_BASE}/search?query=${encodeURIComponent(q)}`,
  );
  const data = (await response.json()) as {
    coins?: Array<{
      id: string;
      name: string;
      symbol: string;
      market_cap_rank: number | null;
    }>;
  };

  const results = (data.coins ?? []).slice(0, limit).map((c) => ({
    id: c.id,
    name: c.name,
    symbol: c.symbol,
    market_cap_rank: c.market_cap_rank,
  }));

  priceCache.set(cacheKey, results, TTL.PRICE);
  return results;
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
    `${COINGECKO_BASE}/coins/${id}/history?date=${encodeURIComponent(date)}&localization=false`,
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

export interface MarketChartPoint {
  timestamp: number;
  price: number;
}

export async function getMarketChart(
  coin: string,
  vsCurrency: string,
  days: number | string,
): Promise<{ id: string; vs: string; days: string; prices: MarketChartPoint[] }> {
  const id = resolveCoinId(coin);
  const vs = vsCurrency.toLowerCase();
  const daysStr = String(days);
  const cacheKey = `chart:${id}:${vs}:${daysStr}`;

  const cached = historicalCache.get<{
    id: string;
    vs: string;
    days: string;
    prices: MarketChartPoint[];
  }>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    vs_currency: vs,
    days: daysStr,
  });

  const response = await fetchWithRetry(
    `${COINGECKO_BASE}/coins/${id}/market_chart?${params}`,
  );
  const data = (await response.json()) as {
    prices?: Array<[number, number]>;
  };

  const prices = (data.prices ?? []).map(([timestamp, price]) => ({
    timestamp,
    price,
  }));

  const result = { id, vs, days: daysStr, prices };
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

export interface TrendingCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
  score: number;
  price_btc: number | null;
  price_usd: number | null;
  change_24h_usd: number | null;
}

export async function getTrendingCoins(): Promise<TrendingCoin[]> {
  const cacheKey = "trending:coins";
  const cached = priceCache.get<TrendingCoin[]>(cacheKey);
  if (cached) return cached;

  const response = await fetchWithRetry(`${COINGECKO_BASE}/search/trending`);
  const data = (await response.json()) as {
    coins?: Array<{
      item: {
        id: string;
        name: string;
        symbol: string;
        market_cap_rank: number | null;
        score: number;
        price_btc?: number;
        data?: {
          price?: number;
          price_change_percentage_24h?: { usd?: number };
        };
      };
    }>;
  };

  const results = (data.coins ?? []).map(({ item }) => ({
    id: item.id,
    name: item.name,
    symbol: item.symbol,
    market_cap_rank: item.market_cap_rank,
    score: item.score,
    price_btc: item.price_btc ?? null,
    price_usd:
      typeof item.data?.price === "number"
        ? formatNumber(item.data.price, priceDecimals("usd", item.data.price))
        : null,
    change_24h_usd:
      typeof item.data?.price_change_percentage_24h?.usd === "number"
        ? formatPercent(item.data.price_change_percentage_24h.usd)
        : null,
  }));

  priceCache.set(cacheKey, results, TTL.TRENDING);
  return results;
}

export interface FearGreedIndex {
  value: number;
  classification: string;
  updatedAt: string;
}

export async function getFearGreedIndex(): Promise<FearGreedIndex> {
  const cacheKey = "fear-greed:1";
  const cached = priceCache.get<FearGreedIndex>(cacheKey);
  if (cached) return cached;

  const response = await fetchWithRetry(
    "https://api.alternative.me/fng/?limit=1",
  );
  const data = (await response.json()) as {
    data?: Array<{
      value: string;
      value_classification: string;
      timestamp: string;
    }>;
  };
  const row = data.data?.[0];
  if (!row) {
    throw new CoinGeckoError("Fear & Greed index unavailable");
  }

  const result: FearGreedIndex = {
    value: Number(row.value),
    classification: row.value_classification,
    updatedAt: new Date(Number(row.timestamp) * 1000).toISOString(),
  };
  priceCache.set(cacheKey, result, TTL.TRENDING);
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatNumber(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(decimals));
}

export function formatPercent(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(decimals));
}

export function priceDecimals(vs: string, price: number): number {
  if (vs === "btc" || vs === "eth") return 8;
  if (price >= 1) return 2;
  if (price >= 0.01) return 4;
  return 8;
}
