export interface LiteAutocompleteModel {
  title?: string;
  name?: string;
  provider?: string;
  model?: string;
  roles?: string[];
  capabilities?: string[];
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
  autocompleteModel?: LiteAutocompleteModel;
  tabAutocompleteOptions: LiteTabAutocompleteOptions;
  nextEditEnabled: boolean;
}

export interface LiteLoaderSettings {
  enableTabAutocomplete?: boolean;
  enableNextEdit?: boolean;
}

export interface LiteLoadConfigOptions {
  workspacePath?: string;
  settings?: LiteLoaderSettings;
}
