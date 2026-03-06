const { readFile, stat } = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_BUDGET_BYTES = 64 * 1024;

const DEFAULT_FORBIDDEN_PATTERNS = [
  /core\/core\.ts$/,
  /core\/config\/ConfigHandler(?:\.ts)?$/,
  /core\/context\/retrieval\//,
  /core\/tools\//,
  /core\/chat\//,
];

async function checkBundle({
  metaFilePath,
  bundleFilePath,
  budgetBytes = DEFAULT_BUDGET_BYTES,
  forbiddenPatterns = DEFAULT_FORBIDDEN_PATTERNS,
}) {
  const [metaSource, bundleStats] = await Promise.all([
    readFile(metaFilePath, "utf8"),
    stat(bundleFilePath),
  ]);

  const meta = JSON.parse(metaSource);
  const inputPaths = Object.keys(meta.inputs ?? {});
  const forbiddenMatches = inputPaths.filter((inputPath) =>
    forbiddenPatterns.some((pattern) => pattern.test(inputPath)),
  );

  const errors = [];

  if (forbiddenMatches.length > 0) {
    errors.push(
      `Forbidden modules found in bundle metadata: ${forbiddenMatches.join(", ")}`,
    );
  }

  if (bundleStats.size > budgetBytes) {
    errors.push(
      `Bundle size ${bundleStats.size} exceeds budget ${budgetBytes} bytes`,
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    bundleBytes: bundleStats.size,
    forbiddenMatches,
  };
}

async function run() {
  const rootDir = path.join(__dirname, "..");
  const result = await checkBundle({
    metaFilePath: path.join(rootDir, "build", "meta.json"),
    bundleFilePath: path.join(rootDir, "out", "extension.js"),
    budgetBytes: DEFAULT_BUDGET_BYTES,
  });

  if (!result.ok) {
    for (const error of result.errors) {
      console.error(error);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `VS Code Lite size check passed (${result.bundleBytes}/${DEFAULT_BUDGET_BYTES} bytes)`,
  );
}

module.exports = {
  DEFAULT_BUDGET_BYTES,
  DEFAULT_FORBIDDEN_PATTERNS,
  checkBundle,
};

if (require.main === module) {
  void run();
}
