import { getPrice } from "../src/tools/get_price.js";
import { convert } from "../src/tools/convert.js";
import { gasTracker } from "../src/tools/gas_tracker.js";
import { profitCalc } from "../src/tools/profit_calc.js";
import { historicalPrice } from "../src/tools/historical_price.js";

async function test() {
  console.log("1. get_price", await getPrice({ coin: "btc", vs_currency: "pkr" }));
  console.log("2. convert", await convert({ amount: 0.1, from: "btc", to: "pkr" }));
  console.log("3. gas_tracker", await gasTracker({ chain: "eth" }));
  console.log("4. profit_calc", profitCalc({ buy_price: 60000, sell_price: 70000, quantity: 0.5 }));
  console.log("5. historical_price", await historicalPrice({ coin: "btc", date: "01-01-2024", vs_currency: "usd" }));
  console.log("ALL OK");
}

test().catch((e) => { console.error(e); process.exit(1); });
