import { z } from "zod";
import { formatNumber, formatPercent } from "../lib/coingecko.js";

export const profitCalcSchema = z.object({
  buy_price: z.number(),
  sell_price: z.number(),
  quantity: z.number(),
  buy_fee_percent: z.number().default(0),
  sell_fee_percent: z.number().default(0),
});

export type ProfitCalcInput = z.infer<typeof profitCalcSchema>;

export function profitCalc(input: ProfitCalcInput) {
  const buy_price = input.buy_price;
  const sell_price = input.sell_price;
  const quantity = input.quantity;
  const buy_fee_percent = input.buy_fee_percent ?? 0;
  const sell_fee_percent = input.sell_fee_percent ?? 0;

  const buyFeeMultiplier = 1 + buy_fee_percent / 100;
  const sellFeeMultiplier = 1 - sell_fee_percent / 100;

  const invested = buy_price * quantity * buyFeeMultiplier;
  const returned = sell_price * quantity * sellFeeMultiplier;
  const profit = returned - invested;
  const roi = invested > 0 ? (profit / invested) * 100 : 0;
  const breakEven =
    sellFeeMultiplier > 0
      ? (buy_price * buyFeeMultiplier) / sellFeeMultiplier
      : buy_price * buyFeeMultiplier;

  return {
    buy_price: formatNumber(buy_price, 2),
    sell_price: formatNumber(sell_price, 2),
    quantity: formatNumber(quantity, 8),
    buy_fee_percent: formatNumber(buy_fee_percent, 4),
    sell_fee_percent: formatNumber(sell_fee_percent, 4),
    invested: formatNumber(invested, 2),
    returned: formatNumber(returned, 2),
    profit: formatNumber(profit, 2),
    roi_percent: formatPercent(roi),
    break_even_price: formatNumber(breakEven, 2),
    is_profit: profit >= 0,
  };
}
