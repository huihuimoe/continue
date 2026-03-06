import { describe, expect, it, vi } from "vitest";

const registeredCommands: string[] = [];

vi.mock("vscode", () => ({
  commands: {
    registerCommand: vi.fn((name: string) => {
      registeredCommands.push(name);
      return { dispose: vi.fn() };
    }),
    executeCommand: vi.fn(),
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((key: string) => {
        if (key === "enableTabAutocomplete") return true;
        if (key === "enableNextEdit") return false;
        return false;
      }),
      update: vi.fn(async () => {}),
    })),
  },
  window: {
    createQuickPick: vi.fn(() => ({
      items: [],
      selectedItems: [],
      onDidAccept: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
    })),
    showInformationMessage: vi.fn(),
  },
  ConfigurationTarget: {
    Global: 1,
  },
}));

describe("autocomplete commands", () => {
  it("registers only lite command set", async () => {
    const { registerAutocompleteCommandsLite } = await import(
      "./autocompleteCommands"
    );

    registeredCommands.length = 0;

    registerAutocompleteCommandsLite(
      { subscriptions: [] } as never,
      { isACConnected: () => true } as never,
    );

    expect(registeredCommands.sort()).toEqual(
      [
        "continue.forceAutocomplete",
        "continue.forceNextEdit",
        "continue.openTabAutocompleteConfigMenu",
        "continue.toggleNextEditEnabled",
        "continue.toggleTabAutocompleteEnabled",
      ].sort(),
    );
  });
});
