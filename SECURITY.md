# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |
| < 1.0   | No        |

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Report privately via GitHub Security Advisories:

https://github.com/nad33mahm3d/mcp-crypto-toolkit/security/advisories/new

Include:

- Description of the issue
- Steps to reproduce
- Impact assessment
- Any suggested fix (optional)

We aim to acknowledge reports within **72 hours** and ship a fix or mitigation as soon as practical.

## Scope

In scope:

- Remote code execution / supply-chain issues in published packages
- Secrets accidentally accepted or logged by the server
- Unsafe handling of untrusted tool input that could harm the host process

Out of scope:

- Third-party API availability (CoinGecko, Binance, gas providers)
- Rate limits / pricing of upstream APIs
- Issues that require a compromised MCP client

## Best practices for users

- Prefer official installs: `npx -y mcp-crypto-toolkit`
- Do not put API keys in public configs or screenshots
- Rotate keys if they may have been exposed
- Pin a version in production if you need reproducibility
