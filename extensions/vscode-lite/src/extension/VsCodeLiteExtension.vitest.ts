import { describe, expect, it, vi } from "vitest";

const activateNextEditMock = vi.fn();

vi.mock("../autocomplete/completionProvider", () => ({
  ContinueCompletionProvider: vi.fn().mockImplementation(() => ({
    activateNextEdit: activateNextEditMock,
    deactivateNextEdit: vi.fn(),
  })),
}));

const setupStatusBarMock = vi.fn();
const monitorBatteryChangesMock = vi.fn(() => ({ dispose: () => {} }));
vi.mock("../autocomplete/statusBar", async () => {
  const actual = await vi.importActual<
    typeof import("../autocomplete/statusBar")
  >("../autocomplete/statusBar");
  return {
    ...actual,
    monitorBatteryChanges: monitorBatteryChangesMock,
    setupStatusBar: setupStatusBarMock,
  };
});

vi.mock("../autocomplete/autocompleteCommands", () => ({
  registerAutocompleteCommandsLite: vi.fn(),
}));

vi.mock("../next-edit/NextEditWindowManager", () => ({
  setupNextEditWindowManager: vi.fn(),
  NextEditWindowManager: {
    clearInstance: vi.fn(),
  },
}));

vi.mock("../next-edit/JumpManager", () => ({
  JumpManager: {
    getInstance: () => ({
      setup: vi.fn(),
    }),
  },
}));

vi.mock("../config/LiteConfigLoader", () => ({
  LiteConfigLoader: vi.fn().mockImplementation(() => ({
    loadConfig: vi.fn().mockResolvedValue({
      autocompleteModels: [],
      selectedAutocompleteModelTitle: undefined,
      tabAutocompleteOptions: {},
      nextEditEnabled: true,
    }),
  })),
}));

vi.mock("vscode", () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: __dirname } }],
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string) => {
        if (key === "enableNextEdit") {
          return true;
        }
        if (key === "enableTabAutocomplete") {
          return true;
        }
        if (key === "pauseTabAutocompleteOnBattery") {
          return false;
        }
        return undefined;
      }),
    })),
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  },
  languages: {
    registerInlineCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
  },
  window: {
    createStatusBarItem: vi.fn(() => ({
      show: vi.fn(),
      dispose: vi.fn(),
      text: "",
      tooltip: "",
      command: "",
    })),
  },
}));

describe("VsCodeLiteExtension", () => {
  it("initializes without referencing undefined nextEditEnabled", async () => {
    const { VsCodeLiteExtension } = await import("./VsCodeLiteExtension");
    expect(
      () => new VsCodeLiteExtension({ subscriptions: [] } as never),
    ).not.toThrow();
  });

  it("activates next edit when enabled", async () => {
    const { VsCodeLiteExtension } = await import("./VsCodeLiteExtension");
    new VsCodeLiteExtension({ subscriptions: [] } as never);
    expect(activateNextEditMock).toHaveBeenCalled();
  });
});
