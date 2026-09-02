# Contributing to mcp-crypto-toolkit

Thanks for contributing. This guide covers development, PRs, and releases.

## Development setup

```bash
git clone https://github.com/nad33mahm3d/mcp-crypto-toolkit.git
cd mcp-crypto-toolkit
npm install
npm test
npm run build
```

### Useful scripts

| Script | Purpose |
|--------|---------|
| `npm test` | Unit tests |
| `npm run build` | Build stdio + HTTP bundles |
| `npm start` / `npm run start:stdio` | Run MCP over stdio |
| `npm run start:http` | Run MCP over HTTP (`/mcp`) |
| `npm run inspector` | MCP Inspector |

### Optional environment

- `COINGECKO_API_KEY` — higher CoinGecko rate limits
- `ETHERSCAN_API_KEY` / `BSCSCAN_API_KEY` / … — gas oracles
- `PORT` — HTTP server port (default `3000`)

Never commit `.env` files or API keys.

## Project layout

```
src/
  index.ts          # stdio entry
  http.ts           # HTTP entry
  server.ts         # tool + prompt registration
  tools/            # MCP tools
  lib/              # CoinGecko, cache, PKR, constants
tests/              # Vitest unit tests
```

## Pull requests

1. Fork and create a branch from `main`
2. Keep changes focused
3. Add/update tests when changing logic
4. Update README/docs if behavior changes
5. Ensure `npm test` and `npm run build` pass
6. Open a PR using the template

## Coding guidelines

- TypeScript ESM, strict mode
- Prefer small, readable tools over large abstractions
- Keep the **zero-config** default (no required API keys)
- Return pretty JSON from tools; use `isError: true` for failures
- Handle CoinGecko `429` with retry and clear messages

## Reporting bugs / features

- Bugs → GitHub Bug report template
- Features → Feature request template
- Security → see [SECURITY.md](./SECURITY.md) (private disclosure)

## Release process (maintainers)

Publishing is automated when a **GitHub Release** is created.

1. Ensure `main` is green (CI)
2. Update [CHANGELOG.md](./CHANGELOG.md)
3. Create a GitHub Release with tag `vX.Y.Z` (e.g. `v1.1.0`)
4. The [Publish workflow](./.github/workflows/publish.yml) will:
   - Sync `package.json` version from the tag
   - Run tests + build
   - `npm publish --access public --provenance`

### Required secret

Add repository secret **`NPM_TOKEN`**:

1. npmjs.com → Access Tokens → Classic → **Automation**
2. GitHub repo → Settings → Secrets and variables → Actions → New repository secret
3. Name: `NPM_TOKEN`

Without `NPM_TOKEN`, the publish job will fail.

## Code of conduct

Be respectful. See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions are licensed under the MIT License.
