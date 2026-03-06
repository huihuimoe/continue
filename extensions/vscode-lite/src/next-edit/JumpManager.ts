import * as vscode from "vscode";

export const ACCEPT_JUMP_COMMAND = "continue.acceptJump";
export const REJECT_JUMP_COMMAND = "continue.rejectJump";

export class JumpManager {
  private static instance: JumpManager | undefined;

  static getInstance() {
    if (!this.instance) {
      this.instance = new JumpManager();
    }

    return this.instance;
  }

  static clearInstance() {
    this.instance = undefined;
  }

  setup(context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand(ACCEPT_JUMP_COMMAND, () => {}),
      vscode.commands.registerCommand(REJECT_JUMP_COMMAND, () => {}),
    );
  }

  registerSelectionChangeHandler() {}
}
