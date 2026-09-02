import { z } from "zod";
import { gasCache, TTL } from "../lib/cache.js";
import {
  GAS_CHAIN_IDS,
  GAS_SCAN_APIS,
  USER_AGENT,
} from "../lib/constants.js";
import { formatNumber } from "../lib/coingecko.js";

export const gasTrackerSchema = z.object({
  chain: z
    .enum(["eth", "bnb", "polygon", "arbitrum", "base"])
    .default("eth"),
});

export type GasTrackerInput = z.infer<typeof gasTrackerSchema>;

interface GasResult {
  chain: string;
  low: number;
  average: number;
  high: number;
  baseFee: number | null;
  unit: "gwei";
  last_updated: string;
  source: string;
}

export async function gasTracker(input: GasTrackerInput): Promise<GasResult> {
  const chain = input.chain;
  const cacheKey = `gas:${chain}`;

  const cached = gasCache.get<GasResult>(cacheKey);
  if (cached) return cached;

  let result: GasResult | undefined;

  const scanConfig = GAS_SCAN_APIS[chain];
  const apiKey = scanConfig ? process.env[scanConfig.apiKeyEnv] : undefined;

  if (scanConfig && apiKey) {
    try {
      result = await fetchScanGasOracle(chain, scanConfig.url, apiKey);
    } catch {
      // fall through to blocknative
    }
  }

  if (!result) {
    result = await fetchBlocknativeGas(chain);
  }

  gasCache.set(cacheKey, result, TTL.GAS);
  return result;
}

async function fetchScanGasOracle(
  chain: string,
  baseUrl: string,
  apiKey: string,
): Promise<GasResult> {
  const url = `${baseUrl}?module=gastracker&action=gasoracle&apikey=${apiKey}`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Scan API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    status?: string;
    result?: {
      SafeGasPrice?: string;
      ProposeGasPrice?: string;
      FastGasPrice?: string;
      suggestBaseFee?: string;
    };
  };

  if (data.status !== "1" || !data.result) {
    throw new Error("Invalid scan gas oracle response");
  }

  return {
    chain,
    low: formatNumber(parseFloat(data.result.SafeGasPrice ?? "0"), 2),
    average: formatNumber(parseFloat(data.result.ProposeGasPrice ?? "0"), 2),
    high: formatNumber(parseFloat(data.result.FastGasPrice ?? "0"), 2),
    baseFee: data.result.suggestBaseFee
      ? formatNumber(parseFloat(data.result.suggestBaseFee), 2)
      : null,
    unit: "gwei",
    last_updated: new Date().toISOString(),
    source: `${chain}scan`,
  };
}

async function fetchBlocknativeGas(chain: string): Promise<GasResult> {
  const chainId = GAS_CHAIN_IDS[chain];
  if (!chainId) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  try {
    const response = await fetch(
      `https://api.blocknative.com/gasprices/blockprices?chainid=${chainId}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
      },
    );

    if (response.ok) {
      const data = (await response.json()) as {
        blockPrices?: Array<{
          baseFeePerGas?: number;
          estimatedPrices?: Array<{
            confidence: number;
            maxPriorityFeePerGas: number;
            maxFeePerGas: number;
            price: number;
          }>;
        }>;
      };

      const block = data.blockPrices?.[0];
      const prices = block?.estimatedPrices ?? [];

      if (prices.length > 0) {
        const sorted = [...prices].sort((a, b) => a.price - b.price);
        const low = sorted[0]?.price ?? 0;
        const high = sorted[sorted.length - 1]?.price ?? 0;
        const mid = sorted[Math.floor(sorted.length / 2)]?.price ?? low;
        const baseFeeGwei = block?.baseFeePerGas
          ? block.baseFeePerGas / 1e9
          : null;

        return {
          chain,
          low: formatNumber(low, 2),
          average: formatNumber(mid, 2),
          high: formatNumber(high, 2),
          baseFee: baseFeeGwei !== null ? formatNumber(baseFeeGwei, 2) : null,
          unit: "gwei",
          last_updated: new Date().toISOString(),
          source: "blocknative",
        };
      }
    }
  } catch {
    // fall through to static estimate
  }

  return fetchCoinGeckoGasEstimate(chain);
}

async function fetchCoinGeckoGasEstimate(chain: string): Promise<GasResult> {
  const chainGasMap: Record<string, string> = {
    eth: "ethereum",
    bnb: "binance-smart-chain",
    polygon: "polygon-pos",
    arbitrum: "arbitrum-one",
    base: "base",
  };

  const platform = chainGasMap[chain];
  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${platform}&vs_currencies=usd&include_last_updated_at=true`,
    {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    },
  );

  const fallbackGas: Record<string, { low: number; average: number; high: number }> = {
    eth: { low: 15, average: 25, high: 40 },
    bnb: { low: 3, average: 5, high: 8 },
    polygon: { low: 30, average: 50, high: 80 },
    arbitrum: { low: 0.1, average: 0.2, high: 0.5 },
    base: { low: 0.01, average: 0.05, high: 0.1 },
  };

  const estimate = fallbackGas[chain] ?? fallbackGas.eth;

  return {
    chain,
    low: estimate.low,
    average: estimate.average,
    high: estimate.high,
    baseFee: null,
    unit: "gwei",
    last_updated: new Date().toISOString(),
    source: response.ok ? "coingecko_estimate" : "static_estimate",
  };
}
