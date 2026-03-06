# VS Code Lite Status Bar Design

## Goal

Bring the VS Code autocomplete status bar behavior into `extensions/vscode-lite` without pulling in the full config/runtime chain.

This design keeps the lite boundary intact while adding:

- richer status bar text and tooltip behavior
- autocomplete enable/disable/pause semantics
- FIM vs Next Edit toggle in the menu
- autocomplete model switching from the menu

This design does not add chat, sidebar, full config editing, or `core/core.ts` / `ConfigHandler` dependencies.

## Scope

### In scope

- Port status bar state semantics from `extensions/vscode/src/autocomplete/statusBar.ts`
- Add a lite model selection menu for autocomplete models
- Add a lite setting to persist the selected autocomplete model
- Keep Next Edit toggle in the status bar menu
- Keep battery pause behavior in lite

### Out of scope

- Chat-related menu entries
- Sidebar navigation and settings page navigation
- Full profile/config mutation flows
- Workspace config helpers from the full VS Code extension
- `ILLM`-based helpers and full model management chains

## Architecture

### `extensions/vscode-lite/src/autocomplete/statusBar.ts`

This remains a local UI/state module.

Responsibilities:

- render `Disabled`, `Enabled`, and `Paused`
- support display-only `loading` and `error` states
- append `(NE)` when Next Edit is enabled
- generate tooltip text from current lite state
- expose menu helpers for:
  - autocomplete enable/disable/pause labels
  - FIM vs Next Edit toggle labels
  - autocomplete model item title/description

This file must not depend on `core/*`, `workspaceConfig`, or full-extension helpers.

### `extensions/vscode-lite/src/config/LiteConfigLoader.ts`

The loader expands from “resolve one autocomplete model” to “resolve the menu-ready autocomplete view”.

It will return:

- `autocompleteModels`
- `selectedAutocompleteModelTitle`
- `autocompleteModel`
- `tabAutocompleteOptions`
- `nextEditEnabled`

Sources remain lightweight:

- `.continue/config.json`
- `.continue/config.yaml`
- `.continue/config.yml`
- VS Code settings under `continue.*`

### `extensions/vscode-lite/src/autocomplete/autocompleteCommands.ts`

The status bar menu becomes a 3-part lite menu:

1. autocomplete state toggle
2. FIM / Next Edit toggle
3. autocomplete model switcher

Selecting a model updates a lite-only VS Code setting instead of rewriting `.continue/config.*`.

### `extensions/vscode-lite/src/extension/VsCodeLiteExtension.ts`

The extension remains the integration layer only.

Responsibilities:

- load lite config state on startup
- initialize the status bar with resolved state
- refresh the status bar when relevant settings change
- keep Next Edit activation/deactivation in sync with lite settings

It must not pull in the full extension command/sidebar/config stack.

## Settings

Add one lite setting:

- `continue.selectedAutocompleteModel`

Purpose:

- persist the model chosen from the lite status bar menu
- avoid mutating `.continue/config.json|yaml`

Selection priority:

1. `continue.selectedAutocompleteModel`
2. explicit `tabAutocompleteModel` from `.continue/config.*`
3. first model with `roles: ["autocomplete"]`

## Status Rules

### Base inputs

- `continue.enableTabAutocomplete`
- `continue.enableNextEdit`
- `continue.pauseTabAutocompleteOnBattery`
- AC power state
- `continue.selectedAutocompleteModel`
- loader-resolved autocomplete models

### State resolution

1. If autocomplete is disabled, status is `Disabled`.
2. If autocomplete is enabled and battery pause applies, status is `Paused`.
3. Otherwise status is `Enabled`.
4. `loading` and `error` only affect presentation, not the persisted enable state.

### Display

- error: `$(alert) Continue Lite (config error)`
- loading: `$(loading~spin) Continue Lite`
- disabled: `$(circle-slash) Continue Lite`
- enabled: `$(check) Continue Lite`
- paused: `$(debug-pause) Continue Lite`
- append ` (NE)` when Next Edit is enabled

### Tooltip

- disabled: `Click to enable tab autocomplete`
- enabled + next edit off: `Tab autocomplete is enabled`
- enabled + next edit on: `Next Edit is enabled`
- paused: `Tab autocomplete is paused`

## Menu Behavior

### Autocomplete state item

When battery pause is not active:

- `Disabled <-> Enabled`

When battery pause is active:

- `Disabled -> Paused -> Enabled -> Disabled`

### FIM / Next Edit item

Show only when the current status is `Enabled`.

Labels:

- `$(export) Use FIM autocomplete over Next Edit`
- `$(sparkle) Use Next Edit over FIM autocomplete`

Selecting the item updates `continue.enableNextEdit`.

### Model switcher

Show a separator labeled `Switch model` followed by autocomplete models resolved by `LiteConfigLoader`.

Rules:

- selected model gets a `$(check)` prefix
- selected model description is `Current autocomplete model`
- no provider-specific API key warnings in lite

Selecting a model updates `continue.selectedAutocompleteModel` and refreshes the status bar.

## Test Plan

### `statusBar.vitest.ts`

Cover:

- text and tooltip per state
- `(NE)` suffix behavior
- paused rendering
- model title/description helpers

### `LiteConfigLoader.vitest.ts`

Cover:

- multiple autocomplete model parsing from JSON/YAML config
- `continue.selectedAutocompleteModel` overriding default selection

### `autocompleteCommands.vitest.ts`

Cover:

- menu contains state toggle, FIM/Next Edit toggle, and model entries
- selecting a model updates `continue.selectedAutocompleteModel`
- selecting FIM/Next Edit updates `continue.enableNextEdit`

### `package.contrib.vitest.ts`

Cover:

- lite package contributes `continue.selectedAutocompleteModel`

## Verification

Run:

- `npm --prefix extensions/vscode-lite run vitest`
- `npm --prefix extensions/vscode-lite run tsc:check`
- `npm --prefix extensions/vscode-lite run build`
