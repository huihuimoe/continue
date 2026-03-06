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
});
