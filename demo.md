# mcp-crypto-toolkit — Example Conversations

---

## 1. Rich price

**User:** What's Bitcoin doing right now?

**Agent:** *(get_price `{ "coin": "btc", "vs_currency": "usd" }`)*

Returns price, market cap, rank, volume, 24h high/low, ATH.

---

## 2. Search + compare

**User:** Find pepe and compare it with doge and shib.

**Agent:** *(search_coin → compare_coins `{ "coins": ["pepe","doge","shib"] }`)*

---

## 3. Portfolio

**User:** I hold 0.25 BTC and 3 ETH. What's that worth in EUR?

**Agent:** *(portfolio_value `{ "holdings": [{"coin":"btc","amount":0.25},{"coin":"eth","amount":3}], "vs_currency":"eur" }`)*

---

## 4. History range

**User:** How has SOL moved over the last 30 days?

**Agent:** *(historical_price `{ "coin": "sol", "days": 30 }`)*

---

## 5. Gas + P&L

**User:** Is ETH gas cheap? Also I bought 1 ETH at 3000 and sold at 3450 with $8 gas.

**Agent:** *(gas_tracker `{ "chain": "eth" }` + profit_calc `{ "buy_price": 3000, "sell_price": 3450, "quantity": 1, "network_fee": 8 }`)*
