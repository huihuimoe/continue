import * as os from "node:os";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerAutocompleteCommandsLite } from "./autocompleteCommands";
import {
  quickPickStatusText,
  setupStatusBar,
  StatusBarStatus,
} from "./statusBar";

type QuickPickAcceptDisposable = {
  dispose: () => void;
};

type QuickPickItem = {
  label?: string;
  description?: string;
  kind?: number;
};

const configValues: Record<string, unknown> = {
  enableTabAutocomplete: true,
  enableNextEdit: false,
  pauseTabAutocompleteOnBattery: false,
};

var updateMock: ReturnType<typeof vi.fn>;
var configurationMock: {
  get: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

let registeredCommands: Record<string, (...args: unknown[]) => unknown> = {};
let quickPickAcceptHandler: (() => void) | undefined;
let quickPickInstance:
  | (QuickPickItem & {
      items: QuickPickItem[];
      selectedItems: QuickPickItem[];
      onDidAccept: (callback: () => void) => QuickPickAcceptDisposable;
      show: () => void;
      dispose: () => void;
    })
  | undefined;

function createQuickPick() {
  quickPickAcceptHandler = undefined;
  quickPickInstance = {
    items: [],
    selectedItems: [],
    onDidAccept: vi.fn((callback: () => void) => {
      quickPickAcceptHandler = callback;
      return { dispose: vi.fn() };
    }),
    show: vi.fn(),
    dispose: vi.fn(),
  } as const;
  return quickPickInstance;
}

vi.mock("vscode", () => {
  updateMock = vi.fn(async () => {});
  const getMock = vi.fn((key: string) => configValues[key]);
  configurationMock = {
    get: getMock,
    update: updateMock,
  };

  return {
    commands: {
      registerCommand: vi.fn(
        (name: string, callback: (...args: unknown[]) => unknown) => {
          registeredCommands[name] = callback;
          return { dispose: vi.fn() };
        },
      ),
      executeCommand: vi.fn(),
    },
    workspace: {
      getConfiguration: vi.fn(() => configurationMock),
    },
    window: {
      createQuickPick: vi.fn(createQuickPick),
      showInformationMessage: vi.fn(),
      createStatusBarItem: vi.fn(() => ({
        show: vi.fn(),
        hide: vi.fn(),
        dispose: vi.fn(),
        text: "",
        tooltip: "",
        command: "",
      })),
    },
    StatusBarAlignment: {
      Right: 1,
    },
    QuickPickItemKind: {
      Separator: 1,
    },
    ConfigurationTarget: {
      Global: 1,
    },
  };
});

describe("autocomplete commands", () => {
  beforeEach(() => {
    registeredCommands = {};
    quickPickAcceptHandler = undefined;
    quickPickInstance = undefined;
    configValues.enableTabAutocomplete = true;
    configValues.enableNextEdit = false;
    configValues.pauseTabAutocompleteOnBattery = false;
    updateMock?.mockClear();
    configurationMock?.get.mockClear();
  });

  it("registers only lite command set", async () => {
    registerAutocompleteCommandsLite(
      { subscriptions: [] } as never,
      { isACConnected: () => true } as never,
      {
        getAutocompleteMenuState: async () => ({
          models: [],
          selectedTitle: undefined,
        }),
      },
    );

    expect(Object.keys(registeredCommands).sort()).toEqual(
      [
        "continue.forceAutocomplete",
        "continue.forceNextEdit",
        "continue.openTabAutocompleteConfigMenu",
        "continue.toggleNextEditEnabled",
        "continue.toggleTabAutocompleteEnabled",
      ].sort(),
    );
  });

  it("renders the autocomplete menu with status, next edit, separator, and models", async () => {
    registerAutocompleteCommandsLite(
      { subscriptions: [] } as never,
      { isACConnected: () => true } as never,
      {
        getAutocompleteMenuState: async () => ({
          models: [
            { title: "Fixture Autocomplete" },
            { title: "Backup Autocomplete" },
          ],
          selectedTitle: "Fixture Autocomplete",
        }),
      },
    );

    setupStatusBar(StatusBarStatus.Enabled);

    const command =
      registeredCommands["continue.openTabAutocompleteConfigMenu"];
    await command();

    const metaKeyLabel = os.platform() === "darwin" ? "⌘" : "Ctrl";

    expect(quickPickInstance).toBeDefined();
    const items = quickPickInstance!.items;
    expect(items[0]?.label).toBe("$(circle-slash) Disable autocomplete");
    expect(items[0]?.description).toBe(
      `${metaKeyLabel} + K, ${metaKeyLabel} + A`,
    );
    expect(items[1]?.label).toBe(
      "$(sparkle) Use Next Edit over FIM autocomplete",
    );
    expect(items[1]?.description).toBe(
      `${metaKeyLabel} + K, ${metaKeyLabel} + N`,
    );
    expect(items[2]).toEqual({ kind: 1, label: "Switch model" });
    expect(items[3]?.label).toBe("$(check) Fixture Autocomplete");
    expect(items[3]?.description).toBe("Current autocomplete model");
    expect(items[4]?.label).toBe("Backup Autocomplete");

    quickPickInstance!.selectedItems = [items[3]!];
    quickPickAcceptHandler?.();

    expect(updateMock).toHaveBeenCalledWith(
      "selectedAutocompleteModel",
      "Fixture Autocomplete",
      1,
    );
  });

  it("keeps autocomplete enabled when paused status is selected", async () => {
    configValues.pauseTabAutocompleteOnBattery = true;

    registerAutocompleteCommandsLite(
      { subscriptions: [] } as never,
      { isACConnected: () => false } as never,
      {
        getAutocompleteMenuState: async () => ({
          models: [],
          selectedTitle: undefined,
        }),
      },
    );

    setupStatusBar(StatusBarStatus.Disabled);

    const command =
      registeredCommands["continue.openTabAutocompleteConfigMenu"];
    await command();

    const items = quickPickInstance!.items;
    expect(items[0]?.label).toBe(quickPickStatusText(StatusBarStatus.Paused));

    quickPickInstance!.selectedItems = [items[0]!];
    quickPickAcceptHandler?.();

    expect(updateMock).toHaveBeenCalledWith("enableTabAutocomplete", true, 1);
  });
});
