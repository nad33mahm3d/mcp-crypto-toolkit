import { z } from "zod";
import { searchCoins } from "../lib/coingecko.js";

export const searchCoinSchema = z.object({
  query: z.string().describe("Name or symbol to search, e.g. pepe, solana, wif"),
  limit: z.number().int().min(1).max(50).default(10),
});

export type SearchCoinInput = z.infer<typeof searchCoinSchema>;

export async function searchCoin(input: SearchCoinInput) {
  const limit = input.limit ?? 10;
  const results = await searchCoins(input.query, limit);
  return {
    query: input.query,
    count: results.length,
    results,
  };
}
