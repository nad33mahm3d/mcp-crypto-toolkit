import { describe, expect, it } from "vitest";
import { profitCalc } from "../src/tools/profit_calc.js";
import { resolveCoinId, formatNumber, formatPercent } from "../src/lib/coingecko.js";
import { Cache } from "../src/lib/cache.js";

describe("resolveCoinId", () => {
  it("maps common symbols", () => {
    expect(resolveCoinId("BTC")).toBe("bitcoin");
    expect(resolveCoinId("eth")).toBe("ethereum");
    expect(resolveCoinId("sol")).toBe("solana");
  });

  it("passes through unknown ids", () => {
    expect(resolveCoinId("my-custom-token")).toBe("my-custom-token");
  });
});

describe("format helpers", () => {
  it("formats numbers and percents", () => {
    expect(formatNumber(1.23456, 2)).toBe(1.23);
    expect(formatPercent(16.666)).toBe(16.67);
  });
});

describe("profit_calc", () => {
  it("computes profit without fees", () => {
    const result = profitCalc({
      buy_price: 60000,
      sell_price: 70000,
      quantity: 0.5,
    });
    expect(result.invested).toBe(30000);
    expect(result.returned).toBe(35000);
    expect(result.profit).toBe(5000);
    expect(result.roi_percent).toBe(16.67);
    expect(result.is_profit).toBe(true);
  });

  it("applies network fee", () => {
    const result = profitCalc({
      buy_price: 100,
      sell_price: 110,
      quantity: 1,
      network_fee: 5,
    });
    expect(result.profit).toBe(5);
    expect(result.profit_before_network_fee).toBe(10);
  });

  it("applies buy and sell fees", () => {
    const result = profitCalc({
      buy_price: 100,
      sell_price: 100,
      quantity: 1,
      buy_fee_percent: 1,
      sell_fee_percent: 1,
    });
    expect(result.is_profit).toBe(false);
    expect(result.profit).toBeLessThan(0);
  });
});

describe("Cache", () => {
  it("stores and expires values", async () => {
    const cache = new Cache();
    cache.set("k", 42, 50);
    expect(cache.get<number>("k")).toBe(42);
    await new Promise((r) => setTimeout(r, 80));
    expect(cache.get<number>("k")).toBeUndefined();
  });
});
