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
  private readonly contextProviders: LiteContextProvider[] = [];

  constructor(private readonly context: vscode.ExtensionContext) {
    const config = vscode.workspace.getConfiguration(EXTENSION_NAME);
    const autocompleteEnabled =
      config.get<boolean>("enableTabAutocomplete") ?? true;
    const nextEditEnabled = config.get<boolean>("enableNextEdit") ?? true;

    setupStatusBar(
      autocompleteEnabled ? StatusBarStatus.Enabled : StatusBarStatus.Disabled,
    );

    this.context.subscriptions.push(
      vscode.languages.registerInlineCompletionItemProvider(
        [{ pattern: "**" }],
        this.completionProvider,
      ),
    );

    this.context.subscriptions.push(monitorBatteryChanges(this.battery));

    registerAutocompleteCommandsLite(this.context, this.battery);

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

        const nextAutocompleteEnabled =
          vscode.workspace
            .getConfiguration(EXTENSION_NAME)
            .get<boolean>("enableTabAutocomplete") ?? true;

        setupStatusBar(
          nextAutocompleteEnabled
            ? StatusBarStatus.Enabled
            : StatusBarStatus.Disabled,
        );

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
}
