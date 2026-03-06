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

const STATUS_BAR_QUICK_PICK_LABELS: Record<StatusBarStatus, string> = {
  [StatusBarStatus.Disabled]: "$(circle-slash) Disable autocomplete",
  [StatusBarStatus.Enabled]: "$(check) Enable autocomplete",
  [StatusBarStatus.Paused]: "$(debug-pause) Pause autocomplete",
};

const LABEL_TO_STATUS = new Map<string, StatusBarStatus>(
  Object.entries(STATUS_BAR_QUICK_PICK_LABELS).map(([status, label]) => [
    label,
    Number(status) as StatusBarStatus,
  ]),
);

const statusBarState = {
  status: undefined as StatusBarStatus | undefined,
  loading: false,
  error: false,
};

let statusBarItem: vscode.StatusBarItem | undefined;
let statusBarFalseTimeout: NodeJS.Timeout | undefined;

export function quickPickStatusText(status: StatusBarStatus | undefined) {
  if (status === undefined) {
    return STATUS_BAR_QUICK_PICK_LABELS[StatusBarStatus.Disabled];
  }
  return STATUS_BAR_QUICK_PICK_LABELS[status];
}

export function getStatusBarStatus() {
  return statusBarState.status;
}

export function getStatusBarStatusFromQuickPickItemLabel(label: string) {
  return LABEL_TO_STATUS.get(label);
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
  const isEnabling = label === USE_NEXT_EDIT_MENU_ITEM_LABEL;
  await config.update(
    "enableNextEdit",
    isEnabling,
    vscode.ConfigurationTarget.Global,
  );
}

function computeStatusBarText(
  status: StatusBarStatus | undefined,
  loading: boolean,
  error: boolean,
) {
  if (error) {
    return "$(alert) Continue Lite (config error)";
  }

  if (loading) {
    return "$(loading~spin) Continue Lite";
  }

  let baseText = "Continue Lite";
  switch (status) {
    case StatusBarStatus.Disabled:
      baseText = "$(circle-slash) Continue Lite";
      break;
    case StatusBarStatus.Enabled:
      baseText = "$(check) Continue Lite";
      break;
    case StatusBarStatus.Paused:
      baseText = "$(debug-pause) Continue Lite";
      break;
  }

  const nextEditEnabled =
    vscode.workspace
      .getConfiguration(EXTENSION_NAME)
      .get<boolean>("enableNextEdit") ?? false;
  if (nextEditEnabled) {
    baseText += " (NE)";
  }

  return baseText;
}

function computeStatusBarTooltip(status: StatusBarStatus | undefined) {
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

function renderStatusBar() {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
    );
  }

  statusBarItem.text = computeStatusBarText(
    statusBarState.status,
    statusBarState.loading,
    statusBarState.error,
  );
  statusBarItem.tooltip = computeStatusBarTooltip(statusBarState.status);
  statusBarItem.command = "continue.openTabAutocompleteConfigMenu";
  statusBarItem.show();
}

export function setupStatusBar(
  status: StatusBarStatus | undefined,
  loading?: boolean,
  error?: boolean,
) {
  if (status !== undefined) {
    statusBarState.status = status;
  }

  if (loading !== undefined) {
    statusBarState.loading = loading;
  }

  if (error !== undefined) {
    statusBarState.error = error;
  }

  if (loading !== false) {
    clearTimeout(statusBarFalseTimeout);
    statusBarFalseTimeout = undefined;
  }

  renderStatusBar();
}

export function stopStatusBarLoading() {
  clearTimeout(statusBarFalseTimeout);
  statusBarFalseTimeout = setTimeout(() => {
    statusBarState.loading = false;
    renderStatusBar();
    statusBarFalseTimeout = undefined;
  }, 100);
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
