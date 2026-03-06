import * as vscode from "vscode";

export async function activate(context: vscode.ExtensionContext) {
  try {
    const activation = await import("./activation/activate");
    return await activation.activate(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await vscode.window.showWarningMessage(
      `Continue Lite activation failed: ${message}`,
    );
    throw error;
  }
}

export function deactivate() {}
