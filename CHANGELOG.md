# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.3] - 2026-09-03

### Added

- `mcpName` for Official MCP Registry ownership verification
- `server.json` (MCP Registry metadata)
- `glama.json` (Glama maintainer claim)
- `smithery.yaml` (Smithery one-click stdio install)

## [1.2.2] - 2026-09-03

### Fixed

- README community doc links on npm: point to GitHub URLs (files not included in the npm tarball)

## [1.2.1] - 2026-09-03

### Fixed

- README demo GIF on npm: use GitHub-hosted URL instead of local `./demo.gif` (not included in the npm tarball)

## [1.2.0] - 2026-09-03

### Changed

- Upgrade Zod to 4 (runtime dependency)
- Upgrade TypeScript to 7 and Vitest to 4 (dev)
- Require Node.js 20+ (`engines` and CI)
- GitHub Actions: checkout v7, setup-node v7
- Disable tsup DTS emit (TS 7 compatibility; JS bundles unchanged)

## [1.1.0] - 2026-09-03

### Added

- Tools: `search_coin`, `top_coins`, `compare_coins`, `portfolio_value`
- Richer `get_price` (market cap, volume, rank, ATH/ATL)
- `historical_price` range mode via `days`
- Gas USD transfer estimates + Optimism chain
- `profit_calc` network fee support
- Optional `COINGECKO_API_KEY`
- MCP prompts: `market-overview`, `analyze-coin`, `trade-pnl`, `gas-check`
- HTTP transport (`npm run start:http`)
- Vitest unit tests and GitHub Actions CI
- `demo.gif`

### Changed

- Package renamed to `mcp-crypto-toolkit` (npm name conflict avoidance)

## [1.0.0] - 2026-09-02

### Added

- Initial release: `get_price`, `convert`, `gas_tracker`, `profit_calc`, `historical_price`
- CoinGecko client with cache + retry
- Binance P2P PKR path for conversions
- MIT license and README

[Unreleased]: https://github.com/nad33mahm3d/mcp-crypto-toolkit/compare/v1.2.3...HEAD
[1.2.3]: https://github.com/nad33mahm3d/mcp-crypto-toolkit/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/nad33mahm3d/mcp-crypto-toolkit/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/nad33mahm3d/mcp-crypto-toolkit/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/nad33mahm3d/mcp-crypto-toolkit/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/nad33mahm3d/mcp-crypto-toolkit/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/nad33mahm3d/mcp-crypto-toolkit/releases/tag/v1.0.0
