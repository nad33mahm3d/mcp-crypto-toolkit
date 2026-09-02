import { z } from "zod";
import { getCoinPrice, formatNumber, formatPercent } from "../lib/coingecko.js";
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
    const usdPrice = await getCoinPrice(coin, "usd");
    const priceInPkr = usdPrice.price * pkr.rate;

    return {
      coin: usdPrice.id,
      price: formatNumber(priceInPkr, 2),
      vs_currency: "pkr",
      "24h_change": usdPrice.change24h
        ? formatPercent(usdPrice.change24h)
        : null,
      last_updated: usdPrice.lastUpdated ?? new Date().toISOString(),
      pkr_source: pkr.source,
      usd_price: formatNumber(usdPrice.price, 2),
    };
  }

  const result = await getCoinPrice(coin, vs);

  return {
    coin: result.id,
    price: formatNumber(result.price, vs === "usd" ? 2 : 4),
    vs_currency: vs,
    "24h_change": result.change24h ? formatPercent(result.change24h) : null,
    last_updated: result.lastUpdated ?? new Date().toISOString(),
  };
}
