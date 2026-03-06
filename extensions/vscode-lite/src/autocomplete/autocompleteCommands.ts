import * as os from "node:os";
import * as vscode from "vscode";

import {
  getAutocompleteStatusBarDescription,
  getAutocompleteStatusBarTitle,
  getNextEditMenuItems,
  getStatusBarStatus,
  getStatusBarStatusFromQuickPickItemLabel,
  handleNextEditToggle,
  isNextEditToggleLabel,
  quickPickStatusText,
  setupStatusBar,
  StatusBarStatus,
} from "./statusBar";
import type { LiteAutocompleteModel } from "../config/types";

const EXTENSION_NAME = "continue";

export interface LiteAutocompleteMenuState {
  models: LiteAutocompleteModel[];
  selectedTitle?: string;
}

export interface RegisterAutocompleteCommandsLiteOptions {
  getAutocompleteMenuState: () => Promise<LiteAutocompleteMenuState>;
}

export function registerAutocompleteCommandsLite(
  context: vscode.ExtensionContext,
  battery: { isACConnected: () => boolean },
  options: RegisterAutocompleteCommandsLiteOptions,
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
      const menuState = (await options.getAutocompleteMenuState()) ?? {
        models: [],
        selectedTitle: undefined,
      };
      const currentStatus = getStatusBarStatus();
      const pauseOnBattery =
        config.get<boolean>("pauseTabAutocompleteOnBattery") &&
        !battery.isACConnected();

      let targetStatus: StatusBarStatus | undefined;
      if (pauseOnBattery) {
        targetStatus =
          currentStatus === StatusBarStatus.Paused
            ? StatusBarStatus.Enabled
            : currentStatus === StatusBarStatus.Disabled
              ? StatusBarStatus.Paused
              : StatusBarStatus.Disabled;
      } else {
        targetStatus =
          currentStatus === StatusBarStatus.Disabled
            ? StatusBarStatus.Enabled
            : StatusBarStatus.Disabled;
      }

      const modelLabelToTitle = new Map<string, string>();
      const modelItems = menuState.models.map((model) => {
        const label = getAutocompleteStatusBarTitle(
          menuState.selectedTitle,
          model,
        );
        const description = getAutocompleteStatusBarDescription(
          menuState.selectedTitle,
          model,
        );
        const canonicalTitle = model.title ?? model.name ?? label;
        modelLabelToTitle.set(label, canonicalTitle);
        return { label, description };
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
        const selectedOption = quickPick.selectedItems[0]?.label;
        if (!selectedOption) {
          quickPick.dispose();
          return;
        }

        const nextStatus =
          getStatusBarStatusFromQuickPickItemLabel(selectedOption);

        if (nextStatus !== undefined) {
          setupStatusBar(nextStatus);
          await config.update(
            "enableTabAutocomplete",
            nextStatus !== StatusBarStatus.Disabled,
            vscode.ConfigurationTarget.Global,
          );
        } else if (isNextEditToggleLabel(selectedOption)) {
          await handleNextEditToggle(selectedOption, config);
        } else if (modelLabelToTitle.has(selectedOption)) {
          const selectedModelLabel = modelLabelToTitle.get(selectedOption);
          if (selectedModelLabel) {
            await config.update(
              "selectedAutocompleteModel",
              selectedModelLabel,
              vscode.ConfigurationTarget.Global,
            );
          }
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
