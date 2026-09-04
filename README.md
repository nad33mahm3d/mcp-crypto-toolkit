# mcp-crypto-toolkit

[![npm version](https://img.shields.io/npm/v/mcp-crypto-toolkit.svg)](https://www.npmjs.com/package/mcp-crypto-toolkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-Server-blue.svg)](https://modelcontextprotocol.io)
[![CI](https://github.com/nad33mahm3d/mcp-crypto-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/nad33mahm3d/mcp-crypto-toolkit/actions/workflows/ci.yml)

**Live crypto prices, conversion, gas tracker, portfolio tools, and calculators for AI agents.**

Ask Claude: *What's ETH doing? Top 10 coins? Gas on Base? What's my portfolio worth?*

![Demo](https://raw.githubusercontent.com/nad33mahm3d/mcp-crypto-toolkit/main/demo.gif)

## Features

- Live prices with market cap, volume, rank, ATH/ATL (CoinGecko)
- Convert between crypto and fiat (optimized PKR via Binance P2P when needed)
- Search coins by name/symbol
- Top coins + gainers/losers snapshot
- Compare 2–5 coins side by side
- Portfolio valuation (batch holdings)
- Historical point-in-time + range charts (7d/30d/…)
- EVM gas tracker with USD transfer estimates
- Profit/loss calculator with exchange + network fees
- MCP prompts for common workflows
- **Zero config** — no API key required (optional `COINGECKO_API_KEY` for higher limits)
- stdio + HTTP transports

## Quick Install

```bash
npx -y mcp-crypto-toolkit
```

## Installation

### Claude Desktop / Cursor / Windsurf

```json
{
  "mcpServers": {
    "crypto-toolkit": {
      "command": "npx",
      "args": ["-y", "mcp-crypto-toolkit"]
    }
  }
}
```

Local build:

```json
{
  "mcpServers": {
    "crypto-toolkit": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/mcp-crypto-toolkit/dist/index.js"]
    }
  }
}
```

### HTTP server

```bash
npm run build
npm run start:http
# POST http://localhost:3000/mcp
```

#### Deploy (Smithery / remote MCP) — optional

**You do not need paid hosting for discoverability.** This server already installs via `npx -y mcp-crypto-toolkit` (stdio) and is listed on the [Official MCP Registry](https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.nad33mahm3d/mcp-crypto-toolkit). Glama and PulseMCP ingest from there — no Fly/Railway bill required.

Only deploy HTTP if you want a **remote** `/mcp` endpoint (e.g. Claude.ai Custom Connector or Smithery URL publish).

#### Claude.ai Custom Connector

1. Deploy HTTP (`npm run start:http` or Docker / MCP Hosting / Render)
2. In Claude.ai: **Settings → Connectors → Add custom connector**
3. URL: `https://YOUR-HOST/mcp` (must include `/mcp`)
4. After upgrading the server, remove and re-add the connector if tools still show as empty

Do **not** put a remote URL in `claude_desktop_config.json` — that file is stdio-only. For Claude Desktop local use, prefer:

```json
{
  "mcpServers": {
    "crypto-toolkit": {
      "command": "npx",
      "args": ["-y", "mcp-crypto-toolkit"]
    }
  }
}
```

**Render (free — no credit card)**

1. Fork/connect repo at [render.com](https://render.com)
2. New → Blueprint → point at this repo (`render.yaml` uses the **Free** plan)
3. After deploy: `https://YOUR-SERVICE.onrender.com/health`
4. Smithery: publish `https://YOUR-SERVICE.onrender.com/mcp`

Free tier sleeps after ~15 min idle; first request may take ~30s to wake.

**Docker (local / your own VPS)**

```bash
docker build -t mcp-crypto-toolkit .
docker run -p 3000:3000 mcp-crypto-toolkit
```

**Paid PaaS (if you outgrow free tier):** Fly.io and Railway work with the included `fly.toml` / `railway.toml` but are **not free** long-term.

Optional env: `COINGECKO_API_KEY`, `COINGECKO_PRO=1`, gas oracle keys (see table below).

## Tools (9)

| Tool | Description |
|------|-------------|
| `get_price` | Live price + market cap, volume, rank, ATH/ATL |
| `convert` | Crypto ↔ fiat/crypto conversion |
| `search_coin` | Search by name or symbol |
| `top_coins` | Top N by market cap/volume + gainers/losers |
| `compare_coins` | Side-by-side compare 2–5 coins |
| `portfolio_value` | Value a list of holdings |
| `historical_price` | Point date or range chart + investment snapshot |
| `gas_tracker` | Gas fees + estimated transfer cost (USD) |
| `profit_calc` | P&L, ROI, break-even (fees + network fee) |

## Prompts

| Prompt | Purpose |
|--------|---------|
| `market-overview` | Top coins + market tone |
| `analyze-coin` | Price + 7d trend for one coin |
| `trade-pnl` | Walk through a P&L calc |
| `gas-check` | Gas + transfer cost advice |

## Example prompts

1. *What's the current price of Bitcoin and its market cap?*
2. *Search for coins matching "pepe"*
3. *Show top 10 coins and today's gainers*
4. *Compare BTC, ETH, and SOL*
5. *Value my portfolio: 0.5 BTC and 2 ETH in USD*
6. *What was ETH on 01-01-2024, and what would $1000 then be worth now?*
7. *Show SOL's 30-day price range*
8. *What's gas on Base right now in USD?*
9. *I bought at 100, sold at 120, qty 10, 0.1% fees — profit?*

## Development

```bash
git clone https://github.com/nad33mahm3d/mcp-crypto-toolkit
cd mcp-crypto-toolkit
npm install
npm test
npm run build
npm run inspector
```

### Optional env

| Variable | Purpose |
|----------|---------|
| `COINGECKO_API_KEY` | Higher CoinGecko rate limits (still optional) |
| `COINGECKO_PRO=1` | Use Pro header with your key |
| `ETHERSCAN_API_KEY` / `BSCSCAN_API_KEY` / … | Better gas oracles |
| `OPTIMISM_API_KEY` | Optimism gas oracle |
| `PORT` | HTTP server port (default 3000) |

Without gas API keys, gas falls back to Blocknative then static estimates.

## Contributing

See [CONTRIBUTING.md](https://github.com/nad33mahm3d/mcp-crypto-toolkit/blob/main/CONTRIBUTING.md) for setup, PR guidelines, and the release process.

- [Code of Conduct](https://github.com/nad33mahm3d/mcp-crypto-toolkit/blob/main/CODE_OF_CONDUCT.md)
- [Security Policy](https://github.com/nad33mahm3d/mcp-crypto-toolkit/blob/main/SECURITY.md)
- [Support](https://github.com/nad33mahm3d/mcp-crypto-toolkit/blob/main/SUPPORT.md)
- [Changelog](https://github.com/nad33mahm3d/mcp-crypto-toolkit/blob/main/CHANGELOG.md)

### Releasing (maintainers)

1. One-time: npm package **Settings → Trusted Publisher** → GitHub Actions → repo `nad33mahm3d/mcp-crypto-toolkit`, workflow `publish.yml`, environment **`release`**, allow **`npm publish`**
2. Update `CHANGELOG.md`
3. Create a GitHub Release with tag `vX.Y.Z`
4. Actions publishes to npm via OIDC (no `NPM_TOKEN`; provenance automatic)

## API Credits

- [CoinGecko](https://www.coingecko.com/) — prices & markets (free tier, no key required)
- [Binance P2P](https://p2p.binance.com/) — USDT/PKR when converting to PKR
- [Etherscan](https://etherscan.io/) family — optional gas oracles
- [Blocknative](https://www.blocknative.com/) — gas fallback

## License

MIT — see [LICENSE](https://github.com/nad33mahm3d/mcp-crypto-toolkit/blob/main/LICENSE)
