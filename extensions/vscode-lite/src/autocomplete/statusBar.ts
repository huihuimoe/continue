import * as vscode from "vscode";
import * as os from "node:os";

const EXTENSION_NAME = "continue";
const USE_FIM_MENU_ITEM_LABEL = "$(export) Use FIM autocomplete over Next Edit";
const USE_NEXT_EDIT_MENU_ITEM_LABEL =
  "$(sparkle) Use Next Edit over FIM autocomplete";

export enum StatusBarStatus {
  Disabled,
  Enabled,
  Paused,
}

let statusBarStatus: StatusBarStatus | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let statusBarFalseTimeout: NodeJS.Timeout | undefined;
let statusBarError = false;

export function quickPickStatusText(status: StatusBarStatus | undefined) {
  switch (status) {
    case StatusBarStatus.Disabled:
      return "$(circle-slash) Disable autocomplete";
    case StatusBarStatus.Enabled:
      return "$(check) Enable autocomplete";
    case StatusBarStatus.Paused:
      return "$(debug-pause) Pause autocomplete";
    default:
      return "$(circle-slash) Disable autocomplete";
  }
}

export function getStatusBarStatus() {
  return statusBarStatus;
}

export function getStatusBarStatusFromQuickPickItemLabel(label: string) {
  switch (label) {
    case "$(circle-slash) Disable autocomplete":
      return StatusBarStatus.Disabled;
    case "$(check) Enable autocomplete":
      return StatusBarStatus.Enabled;
    case "$(debug-pause) Pause autocomplete":
      return StatusBarStatus.Paused;
    default:
      return undefined;
  }
}

function getMetaKeyLabel() {
  const platform = os.platform();
  return platform === "darwin" ? "⌘" : "Ctrl";
}

export function getNextEditMenuItems(
  currentStatus: StatusBarStatus | undefined,
  nextEditEnabled: boolean,
): vscode.QuickPickItem[] {
  if (currentStatus !== StatusBarStatus.Enabled) {
    return [];
  }

  return [
    {
      label: nextEditEnabled
        ? USE_FIM_MENU_ITEM_LABEL
        : USE_NEXT_EDIT_MENU_ITEM_LABEL,
      description: `${getMetaKeyLabel()} + K, ${getMetaKeyLabel()} + N`,
    },
  ];
}

export function isNextEditToggleLabel(label: string) {
  return (
    label === USE_FIM_MENU_ITEM_LABEL || label === USE_NEXT_EDIT_MENU_ITEM_LABEL
  );
}

export async function handleNextEditToggle(
  label: string,
  config: vscode.WorkspaceConfiguration,
) {
  await config.update(
    "enableNextEdit",
    label === USE_NEXT_EDIT_MENU_ITEM_LABEL,
    vscode.ConfigurationTarget.Global,
  );
}

export function stopStatusBarLoading() {
  statusBarFalseTimeout = setTimeout(() => {
    setupStatusBar(StatusBarStatus.Enabled, false);
  }, 100);
}

export function statusBarItemText(
  status: StatusBarStatus | undefined,
  loading?: boolean,
  error?: boolean,
) {
  if (error) {
    return "$(alert) Continue Lite (config error)";
  }

  let text: string;
  switch (status) {
    case StatusBarStatus.Disabled:
      text = "$(circle-slash) Continue Lite";
      break;
    case StatusBarStatus.Enabled:
      text = "$(check) Continue Lite";
      break;
    case StatusBarStatus.Paused:
      text = "$(debug-pause) Continue Lite";
      break;
    default:
      if (loading) {
        text = "$(loading~spin) Continue Lite";
      } else {
        text = "Continue Lite";
      }
  }

  const nextEditEnabled =
    vscode.workspace
      .getConfiguration(EXTENSION_NAME)
      .get<boolean>("enableNextEdit") ?? false;
  if (nextEditEnabled) {
    text += " (NE)";
  }

  return text;
}

export function statusBarItemTooltip(status: StatusBarStatus | undefined) {
  switch (status) {
    case StatusBarStatus.Enabled: {
      const nextEditEnabled =
        vscode.workspace
          .getConfiguration(EXTENSION_NAME)
          .get<boolean>("enableNextEdit") ?? false;
      return nextEditEnabled
        ? "Next Edit is enabled"
        : "Tab autocomplete is enabled";
    }
    case StatusBarStatus.Paused:
      return "Tab autocomplete is paused";
    default:
      return "Click to enable tab autocomplete";
  }
}

export function setupStatusBar(
  status: StatusBarStatus | undefined,
  loading?: boolean,
  error?: boolean,
) {
  if (loading !== false) {
    clearTimeout(statusBarFalseTimeout);
    statusBarFalseTimeout = undefined;
  }

  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
    );
  }

  if (error !== undefined) {
    statusBarError = error;
    if (status === undefined) {
      status = statusBarStatus;
    }
    if (loading === undefined) {
      loading = false;
    }
  }

  statusBarItem.text = statusBarItemText(status, loading, statusBarError);
  statusBarItem.tooltip = statusBarItemTooltip(status ?? statusBarStatus);
  statusBarItem.command = "continue.openTabAutocompleteConfigMenu";
  statusBarItem.show();

  if (status !== undefined) {
    statusBarStatus = status;
  }
}

export function monitorBatteryChanges(battery: {
  onChangeAC?: (listener: (connected: boolean) => void) => vscode.Disposable;
}) {
  return (
    battery.onChangeAC?.((connected) => {
      const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
      const enabled = config.get<boolean>("enableTabAutocomplete") ?? true;
      if (!enabled) {
        setupStatusBar(StatusBarStatus.Disabled);
        return;
      }
      const pauseOnBattery =
        config.get<boolean>("pauseTabAutocompleteOnBattery") ?? false;
      setupStatusBar(
        connected || !pauseOnBattery
          ? StatusBarStatus.Enabled
          : StatusBarStatus.Paused,
      );
    }) ?? { dispose() {} }
  );
}

export function getAutocompleteStatusBarTitle(
  selected: string | undefined,
  model: { title?: string; name?: string },
) {
  const title = model.title ?? model.name ?? "Unnamed Model";
  if (title === selected) {
    return `$(check) ${title}`;
  }
  return title;
}

export function getAutocompleteStatusBarDescription(
  selected: string | undefined,
  model: { title?: string; name?: string },
) {
  const title = model.title ?? model.name;
  if (title !== selected) {
    return undefined;
  }
  return "Current autocomplete model";
}
