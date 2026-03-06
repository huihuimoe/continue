import * as os from "node:os";
import * as vscode from "vscode";

import {
  getAutocompleteStatusBarDescription,
  getAutocompleteStatusBarTitle,
  getNextEditMenuItems,
  getStatusBarStatusFromQuickPickItemLabel,
  handleNextEditToggle,
  isNextEditToggleLabel,
  quickPickStatusText,
  setupStatusBar,
  StatusBarStatus,
} from "./statusBar";
import type { LiteAutocompleteModel } from "../config/types";

const EXTENSION_NAME = "continue";

type ModelQuickPickItem = vscode.QuickPickItem & { identity: string };

export interface LiteAutocompleteMenuState {
  models: LiteAutocompleteModel[];
  selectedIdentity?: string;
}

export interface RegisterAutocompleteCommandsLiteOptions {
  getAutocompleteMenuState: () => Promise<LiteAutocompleteMenuState>;
}

function isBatteryPauseActive(
  config: vscode.WorkspaceConfiguration,
  battery: { isACConnected: () => boolean },
) {
  return (
    Boolean(config.get<boolean>("pauseTabAutocompleteOnBattery")) &&
    !battery.isACConnected()
  );
}

function deriveAutocompleteStatus(
  config: vscode.WorkspaceConfiguration,
  battery: { isACConnected: () => boolean },
): StatusBarStatus {
  const enabled = config.get<boolean>("enableTabAutocomplete");
  const isEnabled = enabled ?? true;

  if (!isEnabled) {
    return StatusBarStatus.Disabled;
  }

  return isBatteryPauseActive(config, battery)
    ? StatusBarStatus.Paused
    : StatusBarStatus.Enabled;
}

function getToggleTargetStatus(
  currentStatus: StatusBarStatus,
  pauseActive: boolean,
) {
  if (pauseActive) {
    return currentStatus === StatusBarStatus.Disabled
      ? StatusBarStatus.Paused
      : StatusBarStatus.Disabled;
  }

  return currentStatus === StatusBarStatus.Disabled
    ? StatusBarStatus.Enabled
    : StatusBarStatus.Disabled;
}

export function registerAutocompleteCommandsLite(
  context: vscode.ExtensionContext,
  battery: { isACConnected: () => boolean },
  options: RegisterAutocompleteCommandsLiteOptions,
) {
  const commandsMap: Record<string, () => unknown | Promise<unknown>> = {
    "continue.toggleTabAutocompleteEnabled": () => {
      const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
      const enabled = config.get<boolean>("enableTabAutocomplete");
      const isEnabled = enabled ?? true;
      const pauseActive = isBatteryPauseActive(config, battery);
      const nextEnabled = !isEnabled;

      void config.update(
        "enableTabAutocomplete",
        nextEnabled,
        vscode.ConfigurationTarget.Global,
      );

      const nextStatus = nextEnabled
        ? pauseActive
          ? StatusBarStatus.Paused
          : StatusBarStatus.Enabled
        : StatusBarStatus.Disabled;
      setupStatusBar(nextStatus);
    },
    "continue.forceAutocomplete": async () => {
      await vscode.commands.executeCommand("editor.action.inlineSuggest.hide");
      await vscode.commands.executeCommand(
        "editor.action.inlineSuggest.trigger",
      );
    },
    "continue.openTabAutocompleteConfigMenu": async () => {
      const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
      const quickPick = vscode.window.createQuickPick();
      let menuState: LiteAutocompleteMenuState = {
        models: [],
        selectedIdentity: undefined,
      };

      try {
        const loadedMenuState = await options.getAutocompleteMenuState();
        if (loadedMenuState) {
          menuState = loadedMenuState;
        }
      } catch (error) {
        console.error(
          "Continue Lite: failed to load autocomplete menu state",
          error,
        );
        void vscode.window.showWarningMessage(
          "Continue Lite: Unable to load autocomplete configuration. Showing fallback menu.",
        );
      }
      const pauseActive = isBatteryPauseActive(config, battery);
      const currentStatus = deriveAutocompleteStatus(config, battery);
      const targetStatus = getToggleTargetStatus(currentStatus, pauseActive);

      const selectedIdentity = menuState.selectedIdentity;
      const modelItems: ModelQuickPickItem[] = menuState.models.map((model) => {
        const label = getAutocompleteStatusBarTitle(selectedIdentity, model);
        const description = getAutocompleteStatusBarDescription(
          selectedIdentity,
          model,
        );
        return {
          label,
          description,
          identity: model.identity ?? "",
        };
      });

      const metaKeyLabel = getMetaKeyLabel();

      quickPick.items = [
        {
          label: quickPickStatusText(targetStatus),
          description: `${metaKeyLabel} + K, ${metaKeyLabel} + A`,
        },
        ...getNextEditMenuItems(
          currentStatus,
          config.get<boolean>("enableNextEdit") ?? false,
        ),
        {
          kind: vscode.QuickPickItemKind.Separator,
          label: "Switch model",
        },
        ...modelItems,
      ];

      quickPick.onDidAccept(async () => {
        const selectedItem = quickPick.selectedItems[0];
        if (!selectedItem) {
          quickPick.dispose();
          return;
        }

        const label = selectedItem.label ?? "";
        const nextStatus = getStatusBarStatusFromQuickPickItemLabel(label);

        if (nextStatus !== undefined) {
          setupStatusBar(nextStatus);
          await config.update(
            "enableTabAutocomplete",
            nextStatus !== StatusBarStatus.Disabled,
            vscode.ConfigurationTarget.Global,
          );
        } else if (isNextEditToggleLabel(label)) {
          await handleNextEditToggle(label, config);
        } else if (
          "identity" in selectedItem &&
          selectedItem.identity &&
          typeof selectedItem.identity === "string"
        ) {
          await config.update(
            "selectedAutocompleteModelIdentity",
            selectedItem.identity,
            vscode.ConfigurationTarget.Global,
          );
        }

        quickPick.dispose();
      });

      quickPick.show();
    },
    "continue.toggleNextEditEnabled": async () => {
      const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
      const autocompleteEnabled =
        config.get<boolean>("enableTabAutocomplete") ?? true;

      if (!autocompleteEnabled) {
        await vscode.window.showInformationMessage(
          "Please enable tab autocomplete first to use Next Edit",
        );
        return;
      }

      const nextEditEnabled = config.get<boolean>("enableNextEdit") ?? false;
      await config.update(
        "enableNextEdit",
        !nextEditEnabled,
        vscode.ConfigurationTarget.Global,
      );
    },
    "continue.forceNextEdit": async () => {
      await vscode.commands.executeCommand("editor.action.inlineSuggest.hide");
      await vscode.commands.executeCommand(
        "editor.action.inlineSuggest.trigger",
      );
    },
  };

  for (const [command, callback] of Object.entries(commandsMap)) {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, callback),
    );
  }
}

function getMetaKeyLabel() {
  const platform = os.platform();
  return platform === "darwin" ? "⌘" : "Ctrl";
}
