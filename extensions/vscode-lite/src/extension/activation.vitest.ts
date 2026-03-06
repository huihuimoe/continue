import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  window: {
    showInformationMessage: vi.fn(() => Promise.resolve(undefined)),
  },
}));

const registerCustomContextProvider = vi.fn();

vi.mock("../extension/VsCodeLiteExtension", () => ({
  VsCodeLiteExtension: vi.fn().mockImplementation(() => ({
    registerCustomContextProvider,
  })),
}));

describe("lite activation", () => {
  it("returns API with registerCustomContextProvider", async () => {
    const { activate } = await import("../activation/activate");

    const api = await activate({ subscriptions: [] } as never);

    expect(api).toHaveProperty("registerCustomContextProvider");
    expect(typeof api.registerCustomContextProvider).toBe("function");
  });
});
