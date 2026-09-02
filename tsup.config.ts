import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/http.ts"],
  format: ["esm"],
  dts: true,
  minify: true,
  shims: true,
  clean: true,
  splitting: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
