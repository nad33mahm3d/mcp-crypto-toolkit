import { z } from "zod";
import {
  getMarkets,
  resolveCoinId,
  formatNumber,
  formatPercent,
  priceDecimals,
} from "../lib/coingecko.js";

export const compareCoinsSchema = z.object({
  coins: z
    .union([
      z.array(z.string()).min(2).max(5),
      z.string().describe("Comma-separated symbols, e.g. btc,eth,sol"),
    ])
    .describe("2–5 coins to compare"),
  vs_currency: z.string().default("usd"),
});

export type CompareCoinsInput = z.infer<typeof compareCoinsSchema>;

function parseCoins(coins: string[] | string): string[] {
  const list = Array.isArray(coins)
    ? coins
    : coins.split(/[,\s]+/).map((c) => c.trim()).filter(Boolean);
  const unique = [...new Set(list.map((c) => c.toLowerCase()))];
  if (unique.length < 2 || unique.length > 5) {
    throw new Error("Provide between 2 and 5 coins to compare");
  }
  return unique;
}

export async function compareCoins(input: CompareCoinsInput) {
  const vs = (input.vs_currency ?? "usd").toLowerCase();
  const coins = parseCoins(input.coins);
  const ids = coins.map(resolveCoinId);

  const markets = await getMarkets(vs, { ids, perPage: ids.length });
  const byId = new Map(markets.map((m) => [m.id, m]));

  const rows = ids.map((id, i) => {
    const m = byId.get(id);
    if (!m) {
      return {
        input: coins[i],
        id,
        found: false as const,
      };
    }
    return {
      input: coins[i],
      id: m.id,
      found: true as const,
      symbol: m.symbol,
      name: m.name,
      rank: m.market_cap_rank,
      price: formatNumber(
        m.current_price ?? 0,
        priceDecimals(vs, m.current_price ?? 0),
      ),
      market_cap: m.market_cap ? formatNumber(m.market_cap, 0) : null,
      total_volume: m.total_volume ? formatNumber(m.total_volume, 0) : null,
      "24h_change": m.price_change_percentage_24h
        ? formatPercent(m.price_change_percentage_24h)
        : null,
    };
  });

  const found = rows.filter((r) => r.found) as Array<{
    id: string;
    "24h_change": number | null;
    market_cap: number | null;
    price: number;
  }>;

  const best24h = [...found].sort(
    (a, b) => (b["24h_change"] ?? -Infinity) - (a["24h_change"] ?? -Infinity),
  )[0];
  const largestMcap = [...found].sort(
    (a, b) => (b.market_cap ?? 0) - (a.market_cap ?? 0),
  )[0];

  return {
    vs_currency: vs,
    coins: rows,
    highlights: {
      best_24h_performer: best24h?.id ?? null,
      largest_market_cap: largestMcap?.id ?? null,
    },
  };
}
