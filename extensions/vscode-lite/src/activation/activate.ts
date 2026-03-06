import { VsCodeLiteExtension } from "../extension/VsCodeLiteExtension";

export async function activate(context: { subscriptions: unknown[] }) {
  const extension = new VsCodeLiteExtension(context as never);

  return {
    registerCustomContextProvider:
      extension.registerCustomContextProvider.bind(extension),
  };
}
