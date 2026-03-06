const fs = require("fs");
const esbuild = require("esbuild");

const flags = process.argv.slice(2);

const esbuildConfig = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "out/extension.js",
  platform: "node",
  format: "cjs",
  external: ["vscode"],
  sourcemap: flags.includes("--sourcemap"),
  minify: flags.includes("--minify"),
  logLevel: "info",
  metafile: true,
  packages: "external",
  tsconfig: "tsconfig.json",
  banner: {
    js: '"use strict";',
  },
  plugins: [
    {
      name: "lite-build-finished",
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length === 0) {
            fs.mkdirSync("build", { recursive: true });
            fs.writeFileSync(
              "build/meta.json",
              JSON.stringify(result.metafile, null, 2),
            );
            console.log("VS Code Lite Extension esbuild complete");
          }
        });
      },
    },
  ],
};

void (async () => {
  if (flags.includes("--watch")) {
    const context = await esbuild.context(esbuildConfig);
    await context.watch();
    return;
  }

  await esbuild.build(esbuildConfig);
})();
