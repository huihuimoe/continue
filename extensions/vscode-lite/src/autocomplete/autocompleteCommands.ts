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

type ModelQuickPickItem = vscode.QuickPickItem & { identity: string };

export interface LiteAutocompleteMenuState {
  models: LiteAutocompleteModel[];
  selectedIdentity?: string;
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
    "continue.toggleTabAutocompleteEnabled": () => {
      const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
      const enabled = config.get<boolean>("enableTabAutocomplete") ?? true;
      const pauseOnBattery = config.get<boolean>(
        "pauseTabAutocompleteOnBattery",
      );

      if (!pauseOnBattery || battery.isACConnected()) {
        void config.update(
          "enableTabAutocomplete",
          !enabled,
          vscode.ConfigurationTarget.Global,
        );
        return;
      }

      if (enabled) {
        const paused = getStatusBarStatus() === StatusBarStatus.Paused;
        if (paused) {
          setupStatusBar(StatusBarStatus.Enabled);
        } else {
          void config.update(
            "enableTabAutocomplete",
            false,
            vscode.ConfigurationTarget.Global,
          );
        }
        return;
      }

      setupStatusBar(StatusBarStatus.Paused);
      void config.update(
        "enableTabAutocomplete",
        true,
        vscode.ConfigurationTarget.Global,
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
