import { z } from "zod";
import {
  getHistoricalPrice,
  getCurrentPriceForComparison,
  getMarketChart,
  formatNumber,
  formatPercent,
  resolveCoinId,
  priceDecimals,
} from "../lib/coingecko.js";

export const historicalPriceSchema = z.object({
  coin: z.string(),
  date: z
    .string()
    .optional()
    .describe("Single date DD-MM-YYYY. Use with investment snapshot."),
  days: z
    .union([z.number(), z.string()])
    .optional()
    .describe("Chart range: 1, 7, 14, 30, 90, 180, 365, or max"),
  vs_currency: z.string().default("usd"),
  investment: z
    .number()
    .default(1000)
    .describe("Hypothetical investment amount on the historical date"),
});

export type HistoricalPriceInput = z.infer<typeof historicalPriceSchema>;

function parseDate(dateStr: string): { formatted: string; iso: string } {
  const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) {
    throw new Error(
      `Invalid date format: ${dateStr}. Expected DD-MM-YYYY (e.g. 15-01-2024)`,
    );
  }

  const [, day, month, year] = match;
  const formatted = `${day}-${month}-${year}`;
  const iso = `${year}-${month}-${day}`;

  const parsed = new Date(iso);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (parsed > today) {
    throw new Error(`Date cannot be in the future: ${dateStr}`);
  }

  return { formatted, iso };
}

function summarizeChart(
  prices: Array<{ timestamp: number; price: number }>,
) {
  if (prices.length === 0) {
    return null;
  }
  const values = prices.map((p) => p.price);
  const start = values[0]!;
  const end = values[values.length - 1]!;
  const high = Math.max(...values);
  const low = Math.min(...values);
  const change = end - start;
  const changePercent = start > 0 ? (change / start) * 100 : 0;

  // Downsample to ~12 points for agent readability
  const step = Math.max(1, Math.floor(prices.length / 12));
  const sample = prices
    .filter((_, i) => i % step === 0 || i === prices.length - 1)
    .map((p) => ({
      time: new Date(p.timestamp).toISOString(),
      price: formatNumber(p.price, priceDecimals("usd", p.price)),
    }));

  return {
    start_price: formatNumber(start, priceDecimals("usd", start)),
    end_price: formatNumber(end, priceDecimals("usd", end)),
    high: formatNumber(high, priceDecimals("usd", high)),
    low: formatNumber(low, priceDecimals("usd", low)),
    change: formatNumber(change, 4),
    change_percent: formatPercent(changePercent),
    points: prices.length,
    sample,
  };
}

export async function historicalPrice(input: HistoricalPriceInput) {
  const vs = (input.vs_currency ?? "usd").toLowerCase();
  const investmentAmount = input.investment ?? 1000;
  const coinId = resolveCoinId(input.coin);

  if (!input.date && !input.days) {
    throw new Error(
      "Provide either date (DD-MM-YYYY) for a point-in-time price, or days (e.g. 7, 30, 90) for a range chart.",
    );
  }

  if (input.days !== undefined && input.days !== null) {
    const chart = await getMarketChart(input.coin, vs, input.days);
    const summary = summarizeChart(chart.prices);
    return {
      mode: "range",
      coin: coinId,
      vs_currency: vs,
      days: String(input.days),
      summary,
    };
  }

  const { formatted } = parseDate(input.date!);
  const historical = await getHistoricalPrice(input.coin, formatted, vs);
  const currentPrice = await getCurrentPriceForComparison(input.coin, vs);

  const coinsBought =
    historical.price > 0 ? investmentAmount / historical.price : 0;
  const currentValue = coinsBought * currentPrice;
  const gainLoss = currentValue - investmentAmount;
  const gainLossPercent =
    investmentAmount > 0 ? (gainLoss / investmentAmount) * 100 : 0;

  return {
    mode: "point",
    coin: coinId,
    date: formatted,
    vs_currency: vs,
    historical_price: formatNumber(
      historical.price,
      priceDecimals(vs, historical.price),
    ),
    current_price: formatNumber(currentPrice, priceDecimals(vs, currentPrice)),
    price_change: formatNumber(currentPrice - historical.price, 4),
    price_change_percent: formatPercent(
      historical.price > 0
        ? ((currentPrice - historical.price) / historical.price) * 100
        : 0,
    ),
    investment_then: {
      invested: investmentAmount,
      coins_bought: formatNumber(coinsBought, 8),
      worth_now: formatNumber(currentValue, 2),
      gain_loss: formatNumber(gainLoss, 2),
      gain_loss_percent: formatPercent(gainLossPercent),
    },
  };
}
