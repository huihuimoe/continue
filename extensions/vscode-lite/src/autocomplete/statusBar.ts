import * as vscode from "vscode";

const EXTENSION_NAME = "continue";
const ENABLE_NEXT_EDIT_LABEL = "$(sparkle) Enable Next Edit";
const DISABLE_NEXT_EDIT_LABEL = "$(circle-slash) Disable Next Edit";

export enum StatusBarStatus {
  Disabled,
  Enabled,
  Paused,
}

let statusBarStatus: StatusBarStatus | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

export function quickPickStatusText(status: StatusBarStatus | undefined) {
  switch (status) {
    case StatusBarStatus.Enabled:
      return "$(circle-slash) Disable autocomplete";
    case StatusBarStatus.Paused:
      return "$(play) Resume autocomplete";
    case StatusBarStatus.Disabled:
    case undefined:
      return "$(check) Enable autocomplete";
  }
}

export function getStatusBarStatus() {
  return statusBarStatus;
}

export function getStatusBarStatusFromQuickPickItemLabel(label: string) {
  switch (label) {
    case "$(check) Enable autocomplete":
    case "$(play) Resume autocomplete":
      return StatusBarStatus.Enabled;
    case "$(circle-slash) Disable autocomplete":
      return StatusBarStatus.Disabled;
    default:
      return undefined;
  }
}

export function getNextEditMenuItems(
  currentStatus: StatusBarStatus | undefined,
  nextEditEnabled: boolean,
) {
  if (currentStatus !== StatusBarStatus.Enabled) {
    return [];
  }

  return [
    {
      label: nextEditEnabled ? DISABLE_NEXT_EDIT_LABEL : ENABLE_NEXT_EDIT_LABEL,
    },
  ];
}

export function isNextEditToggleLabel(label: string) {
  return label === ENABLE_NEXT_EDIT_LABEL || label === DISABLE_NEXT_EDIT_LABEL;
}

export async function handleNextEditToggle(
  label: string,
  config: vscode.WorkspaceConfiguration,
) {
  await config.update(
    "enableNextEdit",
    label === ENABLE_NEXT_EDIT_LABEL,
    vscode.ConfigurationTarget.Global,
  );
}

export function setupStatusBar(status: StatusBarStatus | undefined) {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
    );
  }

  statusBarStatus = status;
  statusBarItem.text =
    status === StatusBarStatus.Enabled
      ? "$(check) Continue Lite"
      : "$(circle-slash) Continue Lite";
  statusBarItem.tooltip = "Continue Lite autocomplete controls";
  statusBarItem.command = "continue.openTabAutocompleteConfigMenu";
  statusBarItem.show();
}

export function monitorBatteryChanges(battery: {
  onChangeAC?: (listener: (connected: boolean) => void) => vscode.Disposable;
}) {
  return (
    battery.onChangeAC?.(() => {
      const enabled =
        vscode.workspace
          .getConfiguration(EXTENSION_NAME)
          .get<boolean>("enableTabAutocomplete") ?? true;
      setupStatusBar(
        enabled ? StatusBarStatus.Enabled : StatusBarStatus.Disabled,
      );
    }) ?? { dispose() {} }
  );
}
