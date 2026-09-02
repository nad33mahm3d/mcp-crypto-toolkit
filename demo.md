# mcp-crypto-price — Example Conversations

Five example conversations showing how AI agents use this MCP server.

---

## 1. Live BTC Price in PKR

**User:** What's the current price of Bitcoin in Pakistani Rupees?

**Agent:** *(calls `get_price` with `{ "coin": "btc", "vs_currency": "pkr" }`)*

**Response:**
```json
{
  "coin": "bitcoin",
  "price": 30123456.78,
  "vs_currency": "pkr",
  "24h_change": 2.34,
  "last_updated": "2026-09-02T14:30:00.000Z",
  "pkr_source": "binance_p2p",
  "usd_price": 97500.00
}
```

**Agent:** Bitcoin is currently trading at approximately **₨30.1 million PKR** (~$97,500 USD), up 2.34% in the last 24 hours. The PKR rate comes from Binance P2P market data.

---

## 2. Convert Crypto to PKR

**User:** How much is 0.1 BTC worth in PKR right now?

**Agent:** *(calls `convert` with `{ "amount": 0.1, "from": "btc", "to": "pkr" }`)*

**Response:**
```json
{
  "amount": 0.1,
  "from": "bitcoin",
  "to": "pkr",
  "converted": 3012345.68,
  "rate": 30123456.78,
  "source": "coingecko_usd + binance_p2p"
}
```

**Agent:** **0.1 BTC** is worth approximately **₨3,012,346 PKR** at the current rate.

---

## 3. Ethereum Gas Fees

**User:** What are ETH gas fees right now? Should I wait to send a transaction?

**Agent:** *(calls `gas_tracker` with `{ "chain": "eth" }`)*

**Response:**
```json
{
  "chain": "eth",
  "low": 12.5,
  "average": 22.3,
  "high": 35.8,
  "baseFee": 18.2,
  "unit": "gwei",
  "last_updated": "2026-09-02T14:30:00.000Z",
  "source": "blocknative"
}
```

**Agent:** Current Ethereum gas fees:
- **Low:** 12.5 gwei (slow, ~5 min)
- **Average:** 22.3 gwei (standard)
- **High:** 35.8 gwei (fast, ~15 sec)

These are moderate fees. For a simple transfer, expect ~$1–3 at average gas.

---

## 4. Profit/Loss Calculator

**User:** I bought 0.5 BTC at $60,000 with a 0.1% buy fee and sold at $70,000 with 0.2% sell fee. What's my profit?

**Agent:** *(calls `profit_calc` with `{ "buy_price": 60000, "sell_price": 70000, "quantity": 0.5, "buy_fee_percent": 0.1, "sell_fee_percent": 0.2 }`)*

**Response:**
```json
{
  "buy_price": 60000,
  "sell_price": 70000,
  "quantity": 0.5,
  "buy_fee_percent": 0.1,
  "sell_fee_percent": 0.2,
  "invested": 30030,
  "returned": 34930,
  "profit": 4900,
  "roi_percent": 16.32,
  "break_even_price": 60120.24,
  "is_profit": true
}
```

**Agent:** Your trade netted a **$4,900 profit** (16.32% ROI). You invested $30,030 (including buy fee) and received $34,930 after the sell fee. Break-even sell price was $60,120.

---

## 5. Historical Price Comparison

**User:** What was Ethereum worth on 01-01-2024? If I had invested $1000 then, what would it be worth today?

**Agent:** *(calls `historical_price` with `{ "coin": "eth", "date": "01-01-2024", "vs_currency": "usd" }`)*

**Response:**
```json
{
  "coin": "ethereum",
  "date": "01-01-2024",
  "vs_currency": "usd",
  "historical_price": 2284.15,
  "current_price": 3450.00,
  "price_change": 1165.85,
  "price_change_percent": 51.04,
  "thousand_investment_then": {
    "invested": 1000,
    "coins_bought": 0.43778947,
    "worth_now": 1510.38,
    "gain_loss": 510.38,
    "gain_loss_percent": 51.04
  }
}
```

**Agent:** On January 1, 2024, ETH was **$2,284**. Today it's **$3,450** (+51%). A **$1,000 investment** then would be worth **$1,510** now — a gain of **$510**.

---

*These examples use live API data. Actual values will vary at runtime.*
