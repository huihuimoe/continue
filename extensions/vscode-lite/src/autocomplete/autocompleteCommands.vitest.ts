import * as os from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerAutocompleteCommandsLite } from "./autocompleteCommands";
import * as statusBar from "./statusBar";
const {
  quickPickStatusText,
  getStatusBarStatus,
  getStatusBarStatusFromQuickPickItemLabel,
  handleNextEditToggle,
  isNextEditToggleLabel,
  StatusBarStatus,
} = statusBar;

type QuickPickAcceptDisposable = {
  dispose: () => void;
};

type QuickPickItem = {
  label?: string;
  description?: string;
  kind?: number;
};

function buildModelIdentity(model: {
  provider?: string;
  model?: string;
  title?: string;
  name?: string;
}) {
  const provider = model.provider ?? "";
  const modelName = model.model ?? "";
  const title = model.title ?? "";
  const name = model.name ?? "";
  return `provider=${provider}|model=${modelName}|title=${title}|name=${name}`;
}

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
let setupStatusBarSpy: ReturnType<typeof vi.spyOn>;

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
      showWarningMessage: vi.fn(),
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
    setupStatusBarSpy = vi.spyOn(statusBar, "setupStatusBar");
    setupStatusBarSpy.mockClear();
  });

  afterEach(() => {
    setupStatusBarSpy.mockRestore();
  });

  it("registers only lite command set", async () => {
    registerAutocompleteCommandsLite(
      { subscriptions: [] } as never,
      { isACConnected: () => true } as never,
      {
        getAutocompleteMenuState: async () => ({
          models: [],
          selectedIdentity: undefined,
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
    const fixtureModel = {
      title: "Fixture Autocomplete",
      provider: "test",
      model: "fixture-autocomplete",
    };
    const backupModel = {
      title: "Backup Autocomplete",
      provider: "test",
      model: "backup-autocomplete",
    };
    const selectedIdentity = buildModelIdentity(fixtureModel);

    registerAutocompleteCommandsLite(
      { subscriptions: [] } as never,
      { isACConnected: () => true } as never,
      {
        getAutocompleteMenuState: async () => ({
          models: [
            { ...fixtureModel, identity: selectedIdentity },
            { ...backupModel, identity: buildModelIdentity(backupModel) },
          ],
          selectedIdentity,
        }),
      },
    );

    statusBar.setupStatusBar(StatusBarStatus.Enabled);

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
      "selectedAutocompleteModelIdentity",
      selectedIdentity,
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
          selectedIdentity: undefined,
        }),
      },
    );

    statusBar.setupStatusBar(StatusBarStatus.Disabled);

    const command =
      registeredCommands["continue.openTabAutocompleteConfigMenu"];
    await command();

    const items = quickPickInstance!.items;
    expect(items[0]?.label).toBe(quickPickStatusText(StatusBarStatus.Paused));

    quickPickInstance!.selectedItems = [items[0]!];
    quickPickAcceptHandler?.();

    expect(updateMock).toHaveBeenCalledWith("enableTabAutocomplete", true, 1);
  });

  it("toggles to paused state semantics when on battery", async () => {
    configValues.pauseTabAutocompleteOnBattery = true;
    configValues.enableTabAutocomplete = false;

    registerAutocompleteCommandsLite(
      { subscriptions: [] } as never,
      { isACConnected: () => false } as never,
      {
        getAutocompleteMenuState: async () => ({
          models: [],
          selectedIdentity: undefined,
        }),
      },
    );

    const command = registeredCommands["continue.toggleTabAutocompleteEnabled"];
    statusBar.setupStatusBar(StatusBarStatus.Disabled);

    await command();

    expect(setupStatusBarSpy).toHaveBeenLastCalledWith(StatusBarStatus.Paused);
    expect(updateMock).toHaveBeenCalledWith("enableTabAutocomplete", true, 1);
  });

  it("falls back to a base menu when loader fails", async () => {
    registerAutocompleteCommandsLite(
      { subscriptions: [] } as never,
      { isACConnected: () => true } as never,
      {
        getAutocompleteMenuState: async () => {
          throw new Error("boom");
        },
      },
    );

    const command =
      registeredCommands["continue.openTabAutocompleteConfigMenu"];

    await expect(command()).resolves.toBeUndefined();

    expect(quickPickInstance).toBeDefined();
    const items = quickPickInstance!.items;
    expect(items[0]?.label).toBe(quickPickStatusText(StatusBarStatus.Disabled));
    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});
