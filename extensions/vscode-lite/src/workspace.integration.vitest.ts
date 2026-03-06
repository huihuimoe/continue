import path from "node:path";
import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

async function readWorkspaceFile(relativePath: string) {
  return readFile(path.join(__dirname, relativePath), "utf8");
}

describe("workspace integration", () => {
  it("adds vscode-lite tasks and launch config", async () => {
    const [tasks, launch, settings] = await Promise.all([
      readWorkspaceFile("../../../.vscode/tasks.json"),
      readWorkspaceFile("../../../.vscode/launch.json"),
      readWorkspaceFile("../../../.vscode/settings.json"),
    ]);

    expect(tasks).toContain('"label": "vscode-lite-extension:build"');
    expect(tasks).toContain('"label": "vscode-lite-extension:esbuild"');
    expect(launch).toContain('"name": "Launch vscode-lite extension"');
    expect(launch).toContain(
      '"--extensionDevelopmentPath=${workspaceFolder}/extensions/vscode-lite"',
    );
    expect(settings).toContain('"extensions/vscode-lite/out/**": true');
  });
});
