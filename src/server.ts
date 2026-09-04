import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { CoinGeckoError } from "./lib/coingecko.js";
import { getPrice, getPriceSchema } from "./tools/get_price.js";
import { convert, convertSchema } from "./tools/convert.js";
import { gasTracker, gasTrackerSchema } from "./tools/gas_tracker.js";
import { profitCalc, profitCalcSchema } from "./tools/profit_calc.js";
import {
  historicalPrice,
  historicalPriceSchema,
} from "./tools/historical_price.js";
import { searchCoin, searchCoinSchema } from "./tools/search_coin.js";
import { topCoins, topCoinsSchema } from "./tools/top_coins.js";
import { compareCoins, compareCoinsSchema } from "./tools/compare_coins.js";
import {
  portfolioValue,
  portfolioValueSchema,
} from "./tools/portfolio_value.js";
import { trending, trendingSchema } from "./tools/trending.js";

const TOOLS = [
  {
    name: "get_price",
    description:
      "Get live price of any cryptocurrency in any fiat, with market cap, volume, rank, ATH/ATL. Uses CoinGecko.",
    inputSchema: {
      type: "object" as const,
      properties: {
        coin: {
          type: "string",
          description: "Coin id or symbol: btc, bitcoin, eth, sol, etc",
        },
        vs_currency: {
          type: "string",
          description: "Fiat: usd, eur, pkr, inr, gbp, etc",
          default: "usd",
        },
      },
      required: ["coin"],
    },
  },
  {
    name: "convert",
    description:
      "Convert crypto amount to fiat/crypto. Optimized PKR via Binance P2P when requested.",
    inputSchema: {
      type: "object" as const,
      properties: {
        amount: { type: "number" },
        from: { type: "string" },
        to: { type: "string", description: "usd, eur, pkr, btc, eth, etc" },
      },
      required: ["amount", "from", "to"],
    },
  },
  {
    name: "gas_tracker",
    description:
      "Live gas fees for EVM chains (eth, bnb, polygon, arbitrum, base, optimism) with estimated transfer cost in native + USD.",
    inputSchema: {
      type: "object" as const,
      properties: {
        chain: {
          type: "string",
          enum: ["eth", "bnb", "polygon", "arbitrum", "base", "optimism"],
          default: "eth",
        },
      },
    },
  },
  {
    name: "profit_calc",
    description:
      "Calculate crypto profit/loss, ROI, break-even. Supports exchange fees and fixed network/gas fee. No API needed.",
    inputSchema: {
      type: "object" as const,
      properties: {
        buy_price: { type: "number" },
        sell_price: { type: "number" },
        quantity: { type: "number" },
        buy_fee_percent: { type: "number", default: 0 },
        sell_fee_percent: { type: "number", default: 0 },
        network_fee: {
          type: "number",
          default: 0,
          description: "Fixed network fee in same unit as prices",
        },
      },
      required: ["buy_price", "sell_price", "quantity"],
    },
  },
  {
    name: "historical_price",
    description:
      "Historical price on a date (DD-MM-YYYY) with investment snapshot, or a range chart via days (1/7/30/90/365/max).",
    inputSchema: {
      type: "object" as const,
      properties: {
        coin: { type: "string" },
        date: { type: "string", description: "DD-MM-YYYY for point-in-time" },
        days: {
          type: ["string", "number"],
          description: "Range chart: 1, 7, 14, 30, 90, 180, 365, or max",
        },
        vs_currency: { type: "string", default: "usd" },
        investment: {
          type: "number",
          default: 1000,
          description: "Hypothetical investment on the historical date",
        },
      },
      required: ["coin"],
    },
  },
  {
    name: "search_coin",
    description:
      "Search cryptocurrencies by name or symbol. Returns CoinGecko ids for use in other tools.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
        limit: { type: "number", default: 10 },
      },
      required: ["query"],
    },
  },
  {
    name: "top_coins",
    description:
      "Top cryptocurrencies by market cap or volume, with gainers/losers among the result set.",
    inputSchema: {
      type: "object" as const,
      properties: {
        vs_currency: { type: "string", default: "usd" },
        limit: { type: "number", default: 10 },
        order: {
          type: "string",
          enum: [
            "market_cap_desc",
            "market_cap_asc",
            "volume_desc",
            "volume_asc",
          ],
          default: "market_cap_desc",
        },
      },
    },
  },
  {
    name: "compare_coins",
    description: "Compare 2–5 cryptocurrencies side by side (price, mcap, volume, 24h change).",
    inputSchema: {
      type: "object" as const,
      properties: {
        coins: {
          oneOf: [
            { type: "string" },
            { type: "array", items: { type: "string" } },
          ],
          description: "Array or comma-separated list, e.g. btc,eth,sol",
        },
        vs_currency: { type: "string", default: "usd" },
      },
      required: ["coins"],
    },
  },
  {
    name: "portfolio_value",
    description:
      "Value a portfolio of holdings in any fiat (batch pricing). Pass [{coin, amount}, ...].",
    inputSchema: {
      type: "object" as const,
      properties: {
        holdings: {
          type: "array",
          items: {
            type: "object",
            properties: {
              coin: { type: "string" },
              amount: { type: "number" },
            },
            required: ["coin", "amount"],
          },
        },
        vs_currency: { type: "string", default: "usd" },
      },
      required: ["holdings"],
    },
  },
  {
    name: "trending",
    description:
      "What's hot right now: CoinGecko trending coins plus Crypto Fear & Greed Index.",
    inputSchema: {
      type: "object" as const,
      properties: {
        include_fear_greed: {
          type: "boolean",
          default: true,
          description: "Include Alternative.me Fear & Greed Index (default true)",
        },
      },
    },
  },
];

const PROMPTS = [
  {
    name: "market-overview",
    description:
      "Global crypto market snapshot: top coins, gainers/losers, and trending + fear/greed",
    arguments: [
      {
        name: "vs_currency",
        description: "Fiat currency (default usd)",
        required: false,
      },
      {
        name: "limit",
        description: "How many top coins (default 10)",
        required: false,
      },
    ],
  },
  {
    name: "whats-trending",
    description: "Trending coins and Fear & Greed Index snapshot",
    arguments: [],
  },
  {
    name: "analyze-coin",
    description: "Analyze a coin: live price, 7d history, and optional conversion",
    arguments: [
      { name: "coin", description: "Coin symbol or id", required: true },
      {
        name: "vs_currency",
        description: "Fiat currency (default usd)",
        required: false,
      },
    ],
  },
  {
    name: "trade-pnl",
    description: "Walk through a profit/loss calculation for a completed trade",
    arguments: [
      { name: "buy_price", description: "Entry price", required: true },
      { name: "sell_price", description: "Exit price", required: true },
      { name: "quantity", description: "Amount traded", required: true },
      {
        name: "fees",
        description: "Optional fee notes (percent or network)",
        required: false,
      },
    ],
  },
  {
    name: "gas-check",
    description: "Check current gas and estimated transfer cost for an EVM chain",
    arguments: [
      {
        name: "chain",
        description: "eth, bnb, polygon, arbitrum, base, or optimism",
        required: false,
      },
    ],
  },
];

function toolError(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

function toolSuccess(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function registerTools(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: PROMPTS,
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const a = (args ?? {}) as Record<string, string>;

    switch (name) {
      case "market-overview": {
        const vs = a.vs_currency ?? "usd";
        const limit = a.limit ?? "10";
        return {
          description: "Market overview workflow",
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `Give me a crypto market overview in ${vs}. 1) Call top_coins with limit ${limit}. 2) Call trending. Summarize leaders, gainers/losers, what's trending, and Fear & Greed tone.`,
              },
            },
          ],
        };
      }
      case "whats-trending": {
        return {
          description: "Trending + sentiment workflow",
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: "Call the trending tool. List the hottest coins and explain the Fear & Greed reading in plain language.",
              },
            },
          ],
        };
      }
      case "analyze-coin": {
        const coin = a.coin;
        if (!coin) throw new Error("coin is required");
        const vs = a.vs_currency ?? "usd";
        return {
          description: `Analyze ${coin}`,
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `Analyze ${coin} in ${vs}. 1) Call get_price. 2) Call historical_price with days=7. 3) Summarize price, market cap, 24h move, and 7-day trend.`,
              },
            },
          ],
        };
      }
      case "trade-pnl": {
        const { buy_price, sell_price, quantity, fees } = a;
        if (!buy_price || !sell_price || !quantity) {
          throw new Error("buy_price, sell_price, and quantity are required");
        }
        return {
          description: "Trade P&L workflow",
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `Calculate P&L with profit_calc: buy_price=${buy_price}, sell_price=${sell_price}, quantity=${quantity}.${fees ? ` Fee notes: ${fees}.` : ""} Explain profit, ROI, and break-even clearly.`,
              },
            },
          ],
        };
      }
      case "gas-check": {
        const chain = a.chain ?? "eth";
        return {
          description: `Gas check for ${chain}`,
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `Check gas on ${chain} with gas_tracker. Report low/average/high gwei and estimated simple-transfer cost in USD. Advise whether fees look cheap or expensive.`,
              },
            },
          ],
        };
      }
      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "get_price":
          return toolSuccess(await getPrice(getPriceSchema.parse(args ?? {})));
        case "convert":
          return toolSuccess(await convert(convertSchema.parse(args ?? {})));
        case "gas_tracker":
          return toolSuccess(
            await gasTracker(gasTrackerSchema.parse(args ?? {})),
          );
        case "profit_calc":
          return toolSuccess(profitCalc(profitCalcSchema.parse(args ?? {})));
        case "historical_price":
          return toolSuccess(
            await historicalPrice(historicalPriceSchema.parse(args ?? {})),
          );
        case "search_coin":
          return toolSuccess(
            await searchCoin(searchCoinSchema.parse(args ?? {})),
          );
        case "top_coins":
          return toolSuccess(await topCoins(topCoinsSchema.parse(args ?? {})));
        case "compare_coins":
          return toolSuccess(
            await compareCoins(compareCoinsSchema.parse(args ?? {})),
          );
        case "portfolio_value":
          return toolSuccess(
            await portfolioValue(portfolioValueSchema.parse(args ?? {})),
          );
        case "trending":
          return toolSuccess(
            await trending(trendingSchema.parse(args ?? {})),
          );
        default:
          return toolError(`Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof CoinGeckoError && error.retryable) {
        return toolError(
          `Rate limit hit: ${error.message}. Wait a few seconds and retry.`,
        );
      }
      const message =
        error instanceof Error ? error.message : "Unknown error occurred";
      return toolError(message);
    }
  });
}
