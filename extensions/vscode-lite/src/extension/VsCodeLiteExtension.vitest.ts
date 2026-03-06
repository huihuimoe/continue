import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as statusBarModule from "../autocomplete/statusBar";
import { StatusBarStatus } from "../autocomplete/statusBar";

const activateNextEditMock = vi.fn();

const configValues = {
  enableNextEdit: true,
  enableTabAutocomplete: true,
  pauseTabAutocompleteOnBattery: false,
};

let configurationMock: {
  get: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

type BatteryMonitorMock = {
  isACConnected: ReturnType<typeof vi.fn>;
  onChangeAC: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
};

let batteryMock: BatteryMonitorMock;
const createBatteryMonitorMock = vi.fn<() => BatteryMonitorMock>();

function createBatteryMock(isAC = true): BatteryMonitorMock {
  return {
    isACConnected: vi.fn(() => isAC),
    onChangeAC: vi.fn(() => ({ dispose: vi.fn() })),
    dispose: vi.fn(),
  };
}

vi.mock("../util/battery", () => ({
  createBatteryMonitor: () => createBatteryMonitorMock(),
}));

vi.mock("../autocomplete/completionProvider", () => ({
  ContinueCompletionProvider: vi.fn().mockImplementation(() => ({
    activateNextEdit: activateNextEditMock,
    deactivateNextEdit: vi.fn(),
  })),
}));

let setupStatusBarMock: ReturnType<typeof vi.spyOn>;

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
    getConfiguration: vi.fn(() => configurationMock),
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
  StatusBarAlignment: {
    Right: 1,
  },
}));

beforeEach(() => {
  batteryMock = createBatteryMock(true);
  createBatteryMonitorMock.mockReturnValue(batteryMock);
  setupStatusBarMock = vi.spyOn(statusBarModule, "setupStatusBar");
  setupStatusBarMock.mockClear();
  activateNextEditMock.mockClear();
  configValues.enableNextEdit = true;
  configValues.enableTabAutocomplete = true;
  configValues.pauseTabAutocompleteOnBattery = false;
  configurationMock = {
    get: vi.fn((key: string) => configValues[key as keyof typeof configValues]),
    update: vi.fn(),
  };
});

afterEach(() => {
  setupStatusBarMock.mockRestore();
});

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

  it("shows paused status when on battery and pause config is true", async () => {
    configValues.pauseTabAutocompleteOnBattery = true;
    batteryMock.isACConnected.mockReturnValue(false);

    const { VsCodeLiteExtension } = await import("./VsCodeLiteExtension");
    new VsCodeLiteExtension({ subscriptions: [] } as never);

    await Promise.resolve();

    expect(setupStatusBarMock).toHaveBeenLastCalledWith(
      StatusBarStatus.Paused,
      false,
      false,
    );
  });
});
