import { beforeEach, describe, expect, it, vi } from "vitest";

const statusBarItem = {
  text: "",
  tooltip: "",
  command: "",
  show: vi.fn(),
};

const configValues: Record<string, unknown> = {};

vi.mock("vscode", () => ({
  StatusBarAlignment: {
    Right: 2,
  },
  ConfigurationTarget: {
    Global: 1,
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: (key: string) => configValues[key],
    })),
  },
  window: {
    createStatusBarItem: vi.fn(() => statusBarItem),
  },
}));

describe("lite status bar", () => {
  beforeEach(() => {
    vi.resetModules();
    configValues.enableNextEdit = false;
    configValues.pauseTabAutocompleteOnBattery = false;
    configValues.enableTabAutocomplete = true;
    statusBarItem.text = "";
    statusBarItem.tooltip = "";
    statusBarItem.command = "";
    statusBarItem.show.mockReset();
  });

  it("reflects the enabled state with Next Edit indicator", async () => {
    configValues.enableNextEdit = true;
    const { setupStatusBar, StatusBarStatus } = await import("./statusBar");

    setupStatusBar(StatusBarStatus.Enabled);

    expect(statusBarItem.text).toContain("$(check) Continue Lite");
    expect(statusBarItem.text).toContain("(NE)");
    expect(statusBarItem.tooltip).toBe("Next Edit is enabled");
  });

  it("renders paused tooltip and icon", async () => {
    const { setupStatusBar, StatusBarStatus } = await import("./statusBar");

    setupStatusBar(StatusBarStatus.Paused);

    expect(statusBarItem.text).toContain("$(debug-pause)");
    expect(statusBarItem.tooltip).toBe("Tab autocomplete is paused");
  });

  it("shows loading text when requested", async () => {
    const { setupStatusBar } = await import("./statusBar");

    setupStatusBar(undefined, true);

    expect(statusBarItem.text).toContain("$(loading~spin)");
    expect(statusBarItem.tooltip).toBe("Click to enable tab autocomplete");
  });

  it("shows an error state when requested", async () => {
    const { setupStatusBar, StatusBarStatus } = await import("./statusBar");

    setupStatusBar(StatusBarStatus.Enabled, false, true);

    expect(statusBarItem.text).toContain("config error");
  });

  it("renders disabled state text and tooltip", async () => {
    const { setupStatusBar, StatusBarStatus } = await import("./statusBar");

    setupStatusBar(StatusBarStatus.Disabled);

    expect(statusBarItem.text).toContain("$(circle-slash) Continue Lite");
    expect(statusBarItem.tooltip).toBe("Click to enable tab autocomplete");
  });

  it("provides model title and description helpers", async () => {
    const {
      getAutocompleteStatusBarTitle,
      getAutocompleteStatusBarDescription,
    } = await import("./statusBar");

    expect(getAutocompleteStatusBarTitle("Model A", { title: "Model A" })).toBe(
      "$(check) Model A",
    );
    expect(
      getAutocompleteStatusBarDescription("Model A", { title: "Model A" }),
    ).toBe("Current autocomplete model");
    expect(
      getAutocompleteStatusBarDescription("Other", { title: "Model A" }),
    ).toBeUndefined();
  });

  it("maps quick pick labels to statuses", async () => {
    const {
      quickPickStatusText,
      getStatusBarStatusFromQuickPickItemLabel,
      StatusBarStatus,
    } = await import("./statusBar");

    expect(
      getStatusBarStatusFromQuickPickItemLabel("$(check) Enable autocomplete"),
    ).toBe(StatusBarStatus.Enabled);
    expect(
      getStatusBarStatusFromQuickPickItemLabel(
        "$(circle-slash) Disable autocomplete",
      ),
    ).toBe(StatusBarStatus.Disabled);
    expect(
      getStatusBarStatusFromQuickPickItemLabel(
        "$(debug-pause) Pause autocomplete",
      ),
    ).toBe(StatusBarStatus.Paused);
    expect(quickPickStatusText(undefined)).toBe(
      quickPickStatusText(StatusBarStatus.Disabled),
    );
  });

  it("toggles next edit via helper", async () => {
    const { handleNextEditToggle } = await import("./statusBar");
    const updateMock = vi.fn();

    await handleNextEditToggle(
      "$(sparkle) Use Next Edit over FIM autocomplete",
      {
        update: updateMock,
      } as any,
    );

    expect(updateMock).toHaveBeenCalledWith("enableNextEdit", true, 1);

    await handleNextEditToggle(
      "$(export) Use FIM autocomplete over Next Edit",
      {
        update: updateMock,
      } as any,
    );

    expect(updateMock).toHaveBeenCalledWith("enableNextEdit", false, 1);
  });

  it("restores base state after loading ends", async () => {
    vi.useFakeTimers();
    const { setupStatusBar, stopStatusBarLoading, StatusBarStatus } =
      await import("./statusBar");

    setupStatusBar(StatusBarStatus.Enabled, true);
    expect(statusBarItem.text).toContain("$(loading~spin)");

    stopStatusBarLoading();
    vi.advanceTimersByTime(200);

    expect(statusBarItem.text).toContain("$(check) Continue Lite");
    vi.useRealTimers();
  });

  it("pauses when on battery", async () => {
    const { setupStatusBar, monitorBatteryChanges, StatusBarStatus } =
      await import("./statusBar");
    const listeners: Array<(connected: boolean) => void> = [];
    const battery = {
      onChangeAC: (listener: (connected: boolean) => void) => {
        listeners.push(listener);
        return { dispose: vi.fn() };
      },
    };

    configValues.pauseTabAutocompleteOnBattery = true;
    configValues.enableTabAutocomplete = true;
    setupStatusBar(StatusBarStatus.Enabled);
    monitorBatteryChanges(battery);
    listeners[0](false);

    expect(statusBarItem.text).toContain("$(debug-pause)");
    expect(statusBarItem.tooltip).toBe("Tab autocomplete is paused");
  });
});
