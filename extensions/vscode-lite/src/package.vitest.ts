import { describe, expect, it } from "vitest";

import pkg from "../package.json";

describe("vscode-lite package", () => {
  it("defines a separate extension main entry", () => {
    expect(pkg.main).toBe("./out/extension.js");
  });
});
