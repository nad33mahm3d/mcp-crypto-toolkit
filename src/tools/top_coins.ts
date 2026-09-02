import { z } from "zod";
import {
  getMarkets,
  formatNumber,
  formatPercent,
  priceDecimals,
} from "../lib/coingecko.js";

export const topCoinsSchema = z.object({
  vs_currency: z.string().default("usd"),
  limit: z.number().int().min(1).max(50).default(10),
  order: z
    .enum([
      "market_cap_desc",
      "market_cap_asc",
      "volume_desc",
      "volume_asc",
      "id_asc",
      "id_desc",
    ])
    .default("market_cap_desc"),
});

export type TopCoinsInput = z.infer<typeof topCoinsSchema>;

export async function topCoins(input: TopCoinsInput) {
  const vs = (input.vs_currency ?? "usd").toLowerCase();
  const limit = input.limit ?? 10;
  const order = input.order ?? "market_cap_desc";

  const markets = await getMarkets(vs, { perPage: limit, order });

  const coins = markets.map((m) => ({
    id: m.id,
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
  }));

  const withChange = coins.filter((c) => c["24h_change"] !== null);
  const gainers = [...withChange]
    .sort((a, b) => (b["24h_change"] ?? 0) - (a["24h_change"] ?? 0))
    .slice(0, 3);
  const losers = [...withChange]
    .sort((a, b) => (a["24h_change"] ?? 0) - (b["24h_change"] ?? 0))
    .slice(0, 3);

  return {
    vs_currency: vs,
    order,
    count: coins.length,
    coins,
    top_gainers: gainers,
    top_losers: losers,
  };
}
