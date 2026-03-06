export interface LiteAutocompleteModel {
  title?: string;
  name?: string;
  provider?: string;
  model?: string;
  roles?: string[];
  capabilities?: string[];
  identity?: string;
  [key: string]: unknown;
}

export interface LiteTabAutocompleteOptions {
  disable?: boolean;
  debounceDelay?: number;
  multilineCompletions?: "always" | "never" | "auto" | string;
  useCache?: boolean;
  disableInFiles?: string[];
  [key: string]: unknown;
}

export interface LiteResolvedConfig {
  autocompleteModels: LiteAutocompleteModel[];
  selectedAutocompleteModelTitle?: string;
  selectedAutocompleteModelId?: string;
  autocompleteModel?: LiteAutocompleteModel;
  tabAutocompleteOptions: LiteTabAutocompleteOptions;
  nextEditEnabled: boolean;
}

export interface LiteLoaderSettings {
  enableTabAutocomplete?: boolean;
  enableNextEdit?: boolean;
  selectedAutocompleteModel?: string;
}

export interface LiteLoadConfigOptions {
  workspacePath?: string;
  settings?: LiteLoaderSettings;
}
