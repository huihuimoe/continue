const esbuild = require("esbuild");

const flags = process.argv.slice(2);

void esbuild.build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "out/extension.js",
  platform: "node",
  format: "cjs",
  external: ["vscode"],
  sourcemap: flags.includes("--sourcemap"),
  minify: flags.includes("--minify"),
  logLevel: "info",
  packages: "external",
  tsconfig: "tsconfig.json",
  banner: {
    js: '"use strict";',
  },
});
