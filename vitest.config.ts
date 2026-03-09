import * as path from "node:path";

const workspaceRoot = __dirname;
const extensionRoot = path.resolve(workspaceRoot, "extensions", "vscode");
const localPrefix = process.env.npm_config_local_prefix;

const root =
  localPrefix && localPrefix.startsWith(workspaceRoot)
    ? localPrefix
    : extensionRoot;

export default {
  root,
  test: {
    include: ["**/*.vitest.ts", "**/*.{test,spec}.?(c|m)[jt]s?(x)"],
    environment: "node",
  },
};
