import { z } from "zod";
import {
  getSimplePrice,
  resolveCoinId,
  formatNumber,
  priceDecimals,
} from "../lib/coingecko.js";
import { convertToPkr } from "../lib/pkr.js";

const holdingSchema = z.object({
  coin: z.string(),
  amount: z.number().positive(),
});

export const portfolioValueSchema = z.object({
  holdings: z
    .array(holdingSchema)
    .min(1)
    .max(50)
    .describe("List of { coin, amount } holdings"),
  vs_currency: z.string().default("usd"),
});

export type PortfolioValueInput = z.infer<typeof portfolioValueSchema>;

export async function portfolioValue(input: PortfolioValueInput) {
  const vs = (input.vs_currency ?? "usd").toLowerCase();
  const holdings = input.holdings;

  const ids = holdings.map((h) => resolveCoinId(h.coin));
  const uniqueIds = [...new Set(ids)];

  // Price everything in USD first for PKR path, else directly in vs
  const priceVs = vs === "pkr" ? "usd" : vs;
  const prices = await getSimplePrice(uniqueIds, [priceVs]);

  let pkrRate: number | null = null;
  let pkrSource: string | null = null;
  if (vs === "pkr") {
    const rate = await convertToPkr(1, "usdt");
    pkrRate = rate.rate;
    pkrSource = rate.source;
  }

  const lines = holdings.map((h, i) => {
    const id = ids[i]!;
    const unit = prices[id]?.[priceVs];
    if (unit === undefined) {
      return {
        coin: id,
        amount: h.amount,
        found: false as const,
        value: null,
      };
    }

    let value = h.amount * unit;
    let unitPrice = unit;
    if (vs === "pkr" && pkrRate !== null) {
      value *= pkrRate;
      unitPrice *= pkrRate;
    }

    return {
      coin: id,
      amount: h.amount,
      found: true as const,
      unit_price: formatNumber(unitPrice, priceDecimals(vs, unitPrice)),
      value: formatNumber(value, 2),
    };
  });

  const total = lines.reduce(
    (sum, line) => sum + (line.found && line.value !== null ? line.value : 0),
    0,
  );

  return {
    vs_currency: vs,
    holdings: lines,
    total_value: formatNumber(total, 2),
    missing: lines.filter((l) => !l.found).map((l) => l.coin),
    ...(pkrSource ? { rate_source: pkrSource } : {}),
  };
}
