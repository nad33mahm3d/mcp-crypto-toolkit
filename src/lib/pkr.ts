import {
  getSimplePrice,
  CoinGeckoError,
  resolveCoinId,
} from "./coingecko.js";
import { pkrCache, TTL } from "./cache.js";
import { USER_AGENT } from "./constants.js";

export interface PkrRateResult {
  rate: number;
  source: "binance_p2p" | "coingecko";
  lastUpdated: string;
}

export async function getUsdtPkrRate(): Promise<PkrRateResult> {
  const cached = pkrCache.get<PkrRateResult>("usdt-pkr");
  if (cached) return cached;

  try {
    const binanceRate = await fetchBinanceP2pRate();
    const result: PkrRateResult = {
      rate: binanceRate,
      source: "binance_p2p",
      lastUpdated: new Date().toISOString(),
    };
    pkrCache.set("usdt-pkr", result, TTL.PKR);
    return result;
  } catch {
    const coingeckoRate = await fetchCoingeckoPkrRate();
    const result: PkrRateResult = {
      rate: coingeckoRate,
      source: "coingecko",
      lastUpdated: new Date().toISOString(),
    };
    pkrCache.set("usdt-pkr", result, TTL.PKR);
    return result;
  }
}

async function fetchBinanceP2pRate(): Promise<number> {
  const response = await fetch(
    "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        asset: "USDT",
        fiat: "PKR",
        merchantCheck: false,
        page: 1,
        payTypes: [],
        publisherType: null,
        rows: 10,
        tradeType: "BUY",
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Binance P2P API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ adv: { price: string } }>;
  };

  const ads = data.data?.slice(0, 5) ?? [];
  if (ads.length === 0) {
    throw new Error("No Binance P2P ads found for USDT/PKR");
  }

  const prices = ads.map((ad) => parseFloat(ad.adv.price)).filter((p) => !isNaN(p));
  if (prices.length === 0) {
    throw new Error("Invalid Binance P2P price data");
  }

  const average = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  return Number(average.toFixed(2));
}

async function fetchCoingeckoPkrRate(): Promise<number> {
  const data = await getSimplePrice(["tether"], ["pkr"]);
  const rate = data.tether?.pkr;
  if (rate === undefined) {
    throw new CoinGeckoError("Could not fetch USDT/PKR rate from CoinGecko");
  }
  return Number(rate.toFixed(2));
}

export async function convertToPkr(
  amount: number,
  fromCoin: string,
): Promise<{ converted: number; rate: number; source: string }> {
  const from = fromCoin.toLowerCase();

  if (from === "pkr") {
    return { converted: amount, rate: 1, source: "direct" };
  }

  if (from === "usdt" || from === "tether") {
    const pkr = await getUsdtPkrRate();
    return {
      converted: Number((amount * pkr.rate).toFixed(2)),
      rate: pkr.rate,
      source: pkr.source,
    };
  }

  const id = resolveCoinId(from);
  const usdtData = await getSimplePrice([id], ["usd"]);
  const usdPrice = usdtData[id]?.usd;

  if (usdPrice === undefined) {
    throw new CoinGeckoError(`Could not get USD price for ${fromCoin}`);
  }

  const usdtAmount = amount * usdPrice;
  const pkr = await getUsdtPkrRate();

  return {
    converted: Number((usdtAmount * pkr.rate).toFixed(2)),
    rate: Number((usdPrice * pkr.rate).toFixed(2)),
    source: `coingecko_usd + ${pkr.source}`,
  };
}

export async function convertFromPkr(
  amount: number,
  toCoin: string,
): Promise<{ converted: number; rate: number; source: string }> {
  const to = toCoin.toLowerCase();

  if (to === "pkr") {
    return { converted: amount, rate: 1, source: "direct" };
  }

  const pkr = await getUsdtPkrRate();
  const usdtAmount = amount / pkr.rate;

  if (to === "usdt" || to === "tether" || to === "usd") {
    return {
      converted: Number(usdtAmount.toFixed(6)),
      rate: Number((1 / pkr.rate).toFixed(8)),
      source: pkr.source,
    };
  }

  const id = resolveCoinId(to);
  const data = await getSimplePrice([id], ["usd"]);
  const usdPrice = data[id]?.usd;

  if (!usdPrice) {
    throw new CoinGeckoError(`Could not get USD price for ${toCoin}`);
  }

  const converted = usdtAmount / usdPrice;
  return {
    converted: Number(converted.toFixed(8)),
    rate: Number((pkr.rate / usdPrice).toFixed(2)),
    source: `coingecko_usd + ${pkr.source}`,
  };
}
