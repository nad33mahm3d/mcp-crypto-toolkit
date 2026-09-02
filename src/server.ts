import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
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

const TOOLS = [
  {
    name: "get_price",
    description:
      "Get live price of any cryptocurrency in any fiat including PKR. Uses CoinGecko.",
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
      "Convert crypto amount to fiat/crypto. Special optimized support for PKR via Binance P2P rate.",
    inputSchema: {
      type: "object" as const,
      properties: {
        amount: { type: "number" },
        from: { type: "string" },
        to: {
          type: "string",
          description: "usd, pkr, btc, eth, etc",
        },
      },
      required: ["amount", "from", "to"],
    },
  },
  {
    name: "gas_tracker",
    description:
      "Get live gas fees for EVM chains: eth, bnb, polygon, arbitrum, base, optimism",
    inputSchema: {
      type: "object" as const,
      properties: {
        chain: {
          type: "string",
          enum: ["eth", "bnb", "polygon", "arbitrum", "base"],
          default: "eth",
        },
      },
    },
  },
  {
    name: "profit_calc",
    description: "Calculate crypto profit/loss, ROI, break-even. No API needed.",
    inputSchema: {
      type: "object" as const,
      properties: {
        buy_price: { type: "number" },
        sell_price: { type: "number" },
        quantity: { type: "number" },
        buy_fee_percent: { type: "number", default: 0 },
        sell_fee_percent: { type: "number", default: 0 },
      },
      required: ["buy_price", "sell_price", "quantity"],
    },
  },
  {
    name: "historical_price",
    description: "Get historical price of coin on specific date. Format DD-MM-YYYY.",
    inputSchema: {
      type: "object" as const,
      properties: {
        coin: { type: "string" },
        date: { type: "string", description: "DD-MM-YYYY" },
        vs_currency: { type: "string", default: "usd" },
      },
      required: ["coin", "date"],
    },
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

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "get_price": {
          const input = getPriceSchema.parse(args ?? {});
          return toolSuccess(await getPrice(input));
        }
        case "convert": {
          const input = convertSchema.parse(args ?? {});
          return toolSuccess(await convert(input));
        }
        case "gas_tracker": {
          const input = gasTrackerSchema.parse(args ?? {});
          return toolSuccess(await gasTracker(input));
        }
        case "profit_calc": {
          const input = profitCalcSchema.parse(args ?? {});
          return toolSuccess(profitCalc(input));
        }
        case "historical_price": {
          const input = historicalPriceSchema.parse(args ?? {});
          return toolSuccess(await historicalPrice(input));
        }
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
