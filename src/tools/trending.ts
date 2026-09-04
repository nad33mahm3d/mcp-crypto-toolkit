import { z } from "zod";
import { getTrendingCoins, getFearGreedIndex } from "../lib/coingecko.js";

export const trendingSchema = z.object({
  include_fear_greed: z.boolean().default(true),
});

export type TrendingInput = z.infer<typeof trendingSchema>;

export async function trending(input: TrendingInput = { include_fear_greed: true }) {
  const includeFg = input.include_fear_greed ?? true;
  const [coins, fearGreed] = await Promise.all([
    getTrendingCoins(),
    includeFg ? getFearGreedIndex() : Promise.resolve(null),
  ]);

  return {
    source: "coingecko",
    count: coins.length,
    coins,
    ...(fearGreed
      ? {
          fear_greed: {
            source: "alternative.me",
            value: fearGreed.value,
            classification: fearGreed.classification,
            updated_at: fearGreed.updatedAt,
          },
        }
      : {}),
  };
}
