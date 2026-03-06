import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

type CheckBundle = (options: {
  metaFilePath: string;
  bundleFilePath: string;
  budgetBytes: number;
}) => Promise<{ ok: boolean; errors: string[] }>;

describe("size check", () => {
  it("fails when forbidden heavy modules are present", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "vscode-lite-size-"));
    const buildDir = path.join(tempDir, "build");
    const outDir = path.join(tempDir, "out");

    await mkdir(buildDir, { recursive: true });
    await mkdir(outDir, { recursive: true });

    await writeFile(
      path.join(buildDir, "meta.json"),
      JSON.stringify({
        inputs: {
          "../../core/context/retrieval/retrieval.ts": { bytes: 100 },
        },
        outputs: {
          "out/extension.js": { bytes: 128 },
        },
      }),
    );
    await writeFile(path.join(outDir, "extension.js"), "console.log('lite');");

    const { checkBundle } = require("../scripts/size-check.js") as {
      checkBundle: CheckBundle;
    };
    const result = await checkBundle({
      metaFilePath: path.join(buildDir, "meta.json"),
      bundleFilePath: path.join(outDir, "extension.js"),
      budgetBytes: 1024,
    });

    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("core/context/retrieval");
  });
});
