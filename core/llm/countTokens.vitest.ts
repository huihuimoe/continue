import { describe, expect, it } from "vitest";

import {
  countTokens,
  countTokensAsync,
  getTokenCountingBufferSafety,
  pruneStringFromBottom,
  pruneStringFromTop,
} from "./countTokens.js";

describe("countTokens approximate estimation", () => {
  it("uses conservative character-based estimation for strings", () => {
    expect(countTokens("abcdef", "gpt-4")).toBe(2);
    expect(countTokens("abcdefg", "claude-3")).toBe(3);
  });

  it("uses the same approximation for async token counting", async () => {
    await expect(countTokensAsync("abcdef", "gpt-4")).resolves.toBe(2);
  });

  it("uses a larger safety buffer for large context windows", () => {
    expect(getTokenCountingBufferSafety(32_000)).toBe(2_000);
  });

  it("prunes strings using approximate character budgets", () => {
    expect(pruneStringFromBottom("gpt-4", 2, "abcdefghi")).toBe("abcdef");
    expect(pruneStringFromTop("gpt-4", 2, "abcdefghi")).toBe("defghi");
  });
});
