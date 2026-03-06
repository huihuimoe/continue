import * as vscode from "vscode";

export const HIDE_NEXT_EDIT_SUGGESTION_COMMAND =
  "continue.nextEditWindow.hideNextEditSuggestion";
export const ACCEPT_NEXT_EDIT_SUGGESTION_COMMAND =
  "continue.nextEditWindow.acceptNextEditSuggestion";

export class NextEditWindowManager {
  private static instance: NextEditWindowManager | undefined;

  static getInstance() {
    if (!this.instance) {
      this.instance = new NextEditWindowManager();
    }

    return this.instance;
  }

  static clearInstance() {
    this.instance = undefined;
  }

  static async freeTabAndEsc() {}

  setup(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand(
        HIDE_NEXT_EDIT_SUGGESTION_COMMAND,
        () => {},
      ),
      vscode.commands.registerCommand(
        ACCEPT_NEXT_EDIT_SUGGESTION_COMMAND,
        () => {},
      ),
    );
  }

  registerSelectionChangeHandler() {}
}

export function setupNextEditWindowManager(context: vscode.ExtensionContext) {
  NextEditWindowManager.getInstance().setup(context);
  return NextEditWindowManager.getInstance();
}
