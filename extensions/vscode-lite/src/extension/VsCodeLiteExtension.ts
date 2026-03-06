export interface LiteContextProvider {
  title?: string;
}

export class VsCodeLiteExtension {
  constructor(private readonly _context: { subscriptions: unknown[] }) {}

  registerCustomContextProvider(_contextProvider: LiteContextProvider) {}
}
