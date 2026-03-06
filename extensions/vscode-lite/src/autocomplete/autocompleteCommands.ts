import * as vscode from "vscode";

import {
  getNextEditMenuItems,
  getStatusBarStatus,
  getStatusBarStatusFromQuickPickItemLabel,
  handleNextEditToggle,
  isNextEditToggleLabel,
  quickPickStatusText,
  setupStatusBar,
  StatusBarStatus,
} from "./statusBar";

const EXTENSION_NAME = "continue";

export function registerAutocompleteCommandsLite(
  context: vscode.ExtensionContext,
  battery: { isACConnected: () => boolean },
) {
  const commandsMap: Record<string, () => unknown | Promise<unknown>> = {
    "continue.toggleTabAutocompleteEnabled": async () => {
      const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
      const enabled = config.get<boolean>("enableTabAutocomplete") ?? true;
      await config.update(
        "enableTabAutocomplete",
        !enabled,
        vscode.ConfigurationTarget.Global,
      );
      setupStatusBar(
        !enabled ? StatusBarStatus.Enabled : StatusBarStatus.Disabled,
      );
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
      const currentStatus = getStatusBarStatus();
      const targetStatus =
        currentStatus === StatusBarStatus.Enabled
          ? StatusBarStatus.Disabled
          : StatusBarStatus.Enabled;
      const nextEditEnabled = config.get<boolean>("enableNextEdit") ?? false;

      quickPick.items = [
        {
          label: quickPickStatusText(targetStatus),
          description: battery.isACConnected() ? "Plugged in" : "On battery",
        },
        ...getNextEditMenuItems(currentStatus, nextEditEnabled),
      ];

      quickPick.onDidAccept(async () => {
        const selectedOption = quickPick.selectedItems[0]?.label;
        if (!selectedOption) {
          quickPick.dispose();
          return;
        }

        const status = getStatusBarStatusFromQuickPickItemLabel(selectedOption);
        if (status !== undefined) {
          setupStatusBar(status);
          await config.update(
            "enableTabAutocomplete",
            status === StatusBarStatus.Enabled,
            vscode.ConfigurationTarget.Global,
          );
        } else if (isNextEditToggleLabel(selectedOption)) {
          await handleNextEditToggle(selectedOption, config);
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
