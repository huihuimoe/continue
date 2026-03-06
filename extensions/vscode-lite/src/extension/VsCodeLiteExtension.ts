import * as vscode from "vscode";

import { registerAutocompleteCommandsLite } from "../autocomplete/autocompleteCommands";
import { ContinueCompletionProvider } from "../autocomplete/completionProvider";
import {
  monitorBatteryChanges,
  setupStatusBar,
  stopStatusBarLoading,
  StatusBarStatus,
} from "../autocomplete/statusBar";
import { JumpManager } from "../next-edit/JumpManager";
import {
  NextEditWindowManager,
  setupNextEditWindowManager,
} from "../next-edit/NextEditWindowManager";
import { LiteConfigLoader } from "../config/LiteConfigLoader";
import type { LiteLoaderSettings, LiteResolvedConfig } from "../config/types";
import { createBatteryMonitor } from "../util/battery";

const EXTENSION_NAME = "continue";

export interface LiteContextProvider {
  title?: string;
}

export class VsCodeLiteExtension {
  private readonly completionProvider = new ContinueCompletionProvider();
  private readonly battery = createBatteryMonitor();
  private readonly configLoader = new LiteConfigLoader();
  private readonly contextProviders: LiteContextProvider[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
    const nextEditEnabled = config.get<boolean>("enableNextEdit") ?? true;

    void this.refreshStatusBarState();

    this.context.subscriptions.push(
      vscode.languages.registerInlineCompletionItemProvider(
        [{ pattern: "**" }],
        this.completionProvider,
      ),
    );

    this.context.subscriptions.push(monitorBatteryChanges(this.battery));
    this.context.subscriptions.push({ dispose: () => this.battery.dispose() });

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

        const shouldRefreshStatusBar =
          event.affectsConfiguration(
            `${EXTENSION_NAME}.enableTabAutocomplete`,
          ) ||
          event.affectsConfiguration(
            `${EXTENSION_NAME}.pauseTabAutocompleteOnBattery`,
          ) ||
          event.affectsConfiguration(
            `${EXTENSION_NAME}.selectedAutocompleteModel`,
          ) ||
          event.affectsConfiguration(`${EXTENSION_NAME}.enableNextEdit`);

        if (shouldRefreshStatusBar) {
          void this.refreshStatusBarState();
        }

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

  private async getAutocompleteMenuState() {
    const loaderRequest = this.createLoaderRequest();
    const resolved = await this.configLoader.loadConfig(loaderRequest);

    return {
      models: resolved.autocompleteModels,
      selectedTitle: resolved.selectedAutocompleteModelTitle,
    };
  }

  private createLoaderRequest() {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
    const settings: LiteLoaderSettings = {
      enableTabAutocomplete: config.get<boolean>("enableTabAutocomplete"),
      enableNextEdit: config.get<boolean>("enableNextEdit"),
      selectedAutocompleteModel: config.get<string>(
        "selectedAutocompleteModel",
      ),
    };

    return { workspacePath, settings };
  }

  private async refreshStatusBarState() {
    const loaderRequest = this.createLoaderRequest();
    setupStatusBar(undefined, true, false);

    try {
      const resolved = await this.configLoader.loadConfig(loaderRequest);
      setupStatusBar(
        this.getStatusBarStatusFromResolved(resolved),
        false,
        false,
      );
    } catch (error) {
      setupStatusBar(undefined, false, true);
      console.error(
        "Continue Lite: failed to refresh autocomplete status",
        error,
      );
    } finally {
      stopStatusBarLoading();
    }
  }

  private getStatusBarStatusFromResolved(
    resolved: LiteResolvedConfig,
  ): StatusBarStatus {
    if (resolved.tabAutocompleteOptions.disable) {
      return StatusBarStatus.Disabled;
    }

    const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
    const pauseOnBattery =
      config.get<boolean>("pauseTabAutocompleteOnBattery") ?? false;

    if (pauseOnBattery && !this.battery.isACConnected()) {
      return StatusBarStatus.Paused;
    }

    return StatusBarStatus.Enabled;
  }
}
