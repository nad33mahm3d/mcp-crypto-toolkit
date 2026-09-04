import packageJson from "../package.json" with { type: "json" };

export const VERSION = packageJson.version as string;
export const SERVER_NAME = "mcp-crypto-toolkit";
export const SERVER_DESCRIPTION =
  "Live crypto prices, conversion, gas tracker, portfolio tools and calculators for AI agents";
