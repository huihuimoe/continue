import * as vscode from "vscode";

export interface LiteContextProvider {
  title?: string;
}

export class ContinueCompletionProvider
  implements vscode.InlineCompletionItemProvider
{
  private nextEditEnabled = false;

  activateNextEdit() {
    this.nextEditEnabled = true;
  }

  deactivateNextEdit() {
    this.nextEditEnabled = false;
  }

  async provideInlineCompletionItems(): Promise<vscode.InlineCompletionList> {
    return { items: [] };
  }

  isNextEditEnabled() {
    return this.nextEditEnabled;
  }
}
