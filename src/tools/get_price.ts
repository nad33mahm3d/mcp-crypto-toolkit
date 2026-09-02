import { z } from "zod";
import {
  getRichCoinPrice,
  getCoinPrice,
  formatNumber,
  formatPercent,
  priceDecimals,
} from "../lib/coingecko.js";
import { getUsdtPkrRate } from "../lib/pkr.js";

export const getPriceSchema = z.object({
  coin: z.string().describe("Coin id or symbol: btc, bitcoin, eth, sol, etc"),
  vs_currency: z
    .string()
    .default("usd")
    .describe("Fiat: usd, eur, pkr, inr, gbp, etc"),
});

export type GetPriceInput = z.infer<typeof getPriceSchema>;

export async function getPrice(input: GetPriceInput) {
  const { coin, vs_currency } = input;
  const vs = vs_currency.toLowerCase();

  if (vs === "pkr") {
    const pkr = await getUsdtPkrRate();
    const market = await getRichCoinPrice(coin, "usd");
    const priceInPkr = (market.current_price ?? 0) * pkr.rate;

    return {
      coin: market.id,
      symbol: market.symbol,
      name: market.name,
      price: formatNumber(priceInPkr, 2),
      vs_currency: "pkr",
      "24h_change": market.price_change_percentage_24h
        ? formatPercent(market.price_change_percentage_24h)
        : null,
      market_cap: market.market_cap
        ? formatNumber(market.market_cap * pkr.rate, 0)
        : null,
      market_cap_rank: market.market_cap_rank,
      total_volume: market.total_volume
        ? formatNumber(market.total_volume * pkr.rate, 0)
        : null,
      high_24h: market.high_24h
        ? formatNumber(market.high_24h * pkr.rate, 2)
        : null,
      low_24h: market.low_24h
        ? formatNumber(market.low_24h * pkr.rate, 2)
        : null,
      ath: market.ath ? formatNumber(market.ath * pkr.rate, 2) : null,
      ath_change_percent: market.ath_change_percentage
        ? formatPercent(market.ath_change_percentage)
        : null,
      usd_price: formatNumber(market.current_price, 2),
      rate_source: pkr.source,
      last_updated: market.last_updated ?? new Date().toISOString(),
    };
  }

  try {
    const market = await getRichCoinPrice(coin, vs);
    const price = market.current_price ?? 0;
    return {
      coin: market.id,
      symbol: market.symbol,
      name: market.name,
      price: formatNumber(price, priceDecimals(vs, price)),
      vs_currency: vs,
      "24h_change": market.price_change_percentage_24h
        ? formatPercent(market.price_change_percentage_24h)
        : null,
      market_cap: market.market_cap
        ? formatNumber(market.market_cap, 0)
        : null,
      market_cap_rank: market.market_cap_rank,
      total_volume: market.total_volume
        ? formatNumber(market.total_volume, 0)
        : null,
      high_24h: market.high_24h
        ? formatNumber(market.high_24h, priceDecimals(vs, market.high_24h))
        : null,
      low_24h: market.low_24h
        ? formatNumber(market.low_24h, priceDecimals(vs, market.low_24h))
        : null,
      ath: market.ath
        ? formatNumber(market.ath, priceDecimals(vs, market.ath))
        : null,
      ath_change_percent: market.ath_change_percentage
        ? formatPercent(market.ath_change_percentage)
        : null,
      atl: market.atl
        ? formatNumber(market.atl, priceDecimals(vs, market.atl))
        : null,
      last_updated: market.last_updated ?? new Date().toISOString(),
    };
  } catch {
    // Fallback to simple price if markets endpoint fails
    const result = await getCoinPrice(coin, vs);
    return {
      coin: result.id,
      price: formatNumber(result.price, priceDecimals(vs, result.price)),
      vs_currency: vs,
      "24h_change": result.change24h ? formatPercent(result.change24h) : null,
      last_updated: result.lastUpdated ?? new Date().toISOString(),
    };
  }
}
