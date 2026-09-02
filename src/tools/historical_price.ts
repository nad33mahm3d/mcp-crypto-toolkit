import { z } from "zod";
import {
  getHistoricalPrice,
  getCurrentPriceForComparison,
  formatNumber,
  formatPercent,
  resolveCoinId,
} from "../lib/coingecko.js";

export const historicalPriceSchema = z.object({
  coin: z.string(),
  date: z.string().describe("DD-MM-YYYY"),
  vs_currency: z.string().default("usd"),
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

export async function historicalPrice(input: HistoricalPriceInput) {
  const { coin, date, vs_currency } = input;
  const vs = vs_currency.toLowerCase();
  const { formatted } = parseDate(date);

  const historical = await getHistoricalPrice(coin, formatted, vs);
  const currentPrice = await getCurrentPriceForComparison(coin, vs);

  const investmentAmount = 1000;
  const coinsBought = investmentAmount / historical.price;
  const currentValue = coinsBought * currentPrice;
  const gainLoss = currentValue - investmentAmount;
  const gainLossPercent =
    investmentAmount > 0 ? (gainLoss / investmentAmount) * 100 : 0;

  return {
    coin: resolveCoinId(coin),
    date: formatted,
    vs_currency: vs,
    historical_price: formatNumber(historical.price, vs === "usd" ? 2 : 4),
    current_price: formatNumber(currentPrice, vs === "usd" ? 2 : 4),
    price_change: formatNumber(currentPrice - historical.price, 2),
    price_change_percent: formatPercent(
      historical.price > 0
        ? ((currentPrice - historical.price) / historical.price) * 100
        : 0,
    ),
    thousand_investment_then: {
      invested: investmentAmount,
      coins_bought: formatNumber(coinsBought, 8),
      worth_now: formatNumber(currentValue, 2),
      gain_loss: formatNumber(gainLoss, 2),
      gain_loss_percent: formatPercent(gainLossPercent),
    },
  };
}
