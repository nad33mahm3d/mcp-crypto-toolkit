import { z } from "zod";
import {
  getCoinPrice,
  getSimplePrice,
  resolveCoinId,
  formatNumber,
} from "../lib/coingecko.js";
import { convertToPkr, convertFromPkr } from "../lib/pkr.js";

export const convertSchema = z.object({
  amount: z.number(),
  from: z.string(),
  to: z.string().describe("usd, pkr, btc, eth, etc"),
});

export type ConvertInput = z.infer<typeof convertSchema>;

export async function convert(input: ConvertInput) {
  const { amount, from, to } = input;
  const fromLower = from.toLowerCase();
  const toLower = to.toLowerCase();

  if (fromLower === toLower) {
    return {
      amount,
      from: fromLower,
      to: toLower,
      converted: amount,
      rate: 1,
      source: "direct",
    };
  }

  if (toLower === "pkr") {
    const result = await convertToPkr(amount, fromLower);
    return {
      amount,
      from: resolveCoinId(fromLower),
      to: "pkr",
      converted: result.converted,
      rate: result.rate,
      source: result.source,
    };
  }

  if (fromLower === "pkr") {
    const result = await convertFromPkr(amount, toLower);
    return {
      amount,
      from: "pkr",
      to: resolveCoinId(toLower),
      converted: result.converted,
      rate: result.rate,
      source: result.source,
    };
  }

  const fromId = resolveCoinId(fromLower);
  const toId = resolveCoinId(toLower);

  const fiatCurrencies = new Set([
    "usd",
    "eur",
    "gbp",
    "jpy",
    "inr",
    "aud",
    "cad",
    "chf",
    "cny",
  ]);

  if (fiatCurrencies.has(toLower)) {
    const price = await getCoinPrice(fromLower, toLower);
    return {
      amount,
      from: fromId,
      to: toLower,
      converted: formatNumber(amount * price.price, 2),
      rate: formatNumber(price.price, 2),
      source: "coingecko",
    };
  }

  if (fiatCurrencies.has(fromLower)) {
    const price = await getCoinPrice(toLower, fromLower);
    return {
      amount,
      from: fromLower,
      to: toId,
      converted: formatNumber(amount / price.price, 8),
      rate: formatNumber(1 / price.price, 8),
      source: "coingecko",
    };
  }

  const data = await getSimplePrice([fromId, toId], ["usd"]);
  const fromUsd = data[fromId]?.usd;
  const toUsd = data[toId]?.usd;

  if (!fromUsd || !toUsd) {
    throw new Error(`Could not convert ${from} to ${to}`);
  }

  const rate = fromUsd / toUsd;
  const converted = amount * rate;

  return {
    amount,
    from: fromId,
    to: toId,
    converted: formatNumber(converted, 8),
    rate: formatNumber(rate, 8),
    source: "coingecko",
  };
}
