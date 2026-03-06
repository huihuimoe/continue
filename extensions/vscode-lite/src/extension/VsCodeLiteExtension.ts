import * as vscode from "vscode";

import { registerAutocompleteCommandsLite } from "../autocomplete/autocompleteCommands";
import { ContinueCompletionProvider } from "../autocomplete/completionProvider";
import {
  monitorBatteryChanges,
  setupStatusBar,
  StatusBarStatus,
} from "../autocomplete/statusBar";
import { JumpManager } from "../next-edit/JumpManager";
import {
  NextEditWindowManager,
  setupNextEditWindowManager,
} from "../next-edit/NextEditWindowManager";
import { LiteConfigLoader } from "../config/LiteConfigLoader";

const EXTENSION_NAME = "continue";

export interface LiteContextProvider {
  title?: string;
}

export class VsCodeLiteExtension {
  private readonly completionProvider = new ContinueCompletionProvider();
  private readonly battery = {
    isACConnected: () => true,
    onChangeAC: () => ({ dispose() {} }),
  };
  private readonly configLoader = new LiteConfigLoader();
  private readonly contextProviders: LiteContextProvider[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {
    setupStatusBar(this.getDesiredStatusStatus());

    this.context.subscriptions.push(
      vscode.languages.registerInlineCompletionItemProvider(
        [{ pattern: "**" }],
        this.completionProvider,
      ),
    );

    this.context.subscriptions.push(monitorBatteryChanges(this.battery));

    registerAutocompleteCommandsLite(this.context, this.battery, {
      getAutocompleteMenuState: () => this.getAutocompleteMenuState(),
    });

    setupNextEditWindowManager(this.context);
    JumpManager.getInstance().setup(this.context);

    if (nextEditEnabled) {
      this.activateNextEdit();
    }

    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (!event.affectsConfiguration(EXTENSION_NAME)) {
          return;
        }

        setupStatusBar(this.getDesiredStatusStatus());

        if (event.affectsConfiguration(`${EXTENSION_NAME}.enableNextEdit`)) {
          const shouldEnableNextEdit =
            vscode.workspace
              .getConfiguration(EXTENSION_NAME)
              .get<boolean>("enableNextEdit") ?? true;

          if (shouldEnableNextEdit) {
            this.activateNextEdit();
            return;
          }

          this.deactivateNextEdit();
          NextEditWindowManager.clearInstance();
        }
      }),
    );
  }

  registerCustomContextProvider(contextProvider: LiteContextProvider) {
    this.contextProviders.push(contextProvider);
  }

  activateNextEdit() {
    this.completionProvider.activateNextEdit();
  }

  deactivateNextEdit() {
    this.completionProvider.deactivateNextEdit();
  }

  private getDesiredStatusStatus() {
    const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
    const enabled = config.get<boolean>("enableTabAutocomplete") ?? true;
    if (!enabled) {
      return StatusBarStatus.Disabled;
    }

    const pauseOnBattery =
      config.get<boolean>("pauseTabAutocompleteOnBattery") ?? false;
    if (pauseOnBattery && !this.battery.isACConnected()) {
      return StatusBarStatus.Paused;
    }

    return StatusBarStatus.Enabled;
  }

  private async getAutocompleteMenuState() {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
    const settings = {
      enableTabAutocomplete: config.get<boolean>("enableTabAutocomplete"),
      enableNextEdit: config.get<boolean>("enableNextEdit"),
      selectedAutocompleteModel: config.get<string>(
        "selectedAutocompleteModel",
      ),
    };

    const resolved = await this.configLoader.loadConfig({
      workspacePath,
      settings,
    });

    return {
      models: resolved.autocompleteModels,
      selectedTitle: resolved.selectedAutocompleteModelTitle,
    };
  }
}
