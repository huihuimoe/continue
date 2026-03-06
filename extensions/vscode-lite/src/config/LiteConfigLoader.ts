import { access, readFile } from "node:fs/promises";
import path from "node:path";

import YAML from "yaml";

import type {
  LiteAutocompleteModel,
  LiteLoadConfigOptions,
  LiteResolvedConfig,
  LiteTabAutocompleteOptions,
} from "./types";

interface ContinueJsonLike {
  tabAutocompleteModel?: LiteAutocompleteModel | LiteAutocompleteModel[];
  tabAutocompleteOptions?: LiteTabAutocompleteOptions;
  models?: LiteAutocompleteModel[];
}

export class LiteConfigLoader {
  async loadConfig(
    options: LiteLoadConfigOptions = {},
  ): Promise<LiteResolvedConfig> {
    const continueConfig = options.workspacePath
      ? await this.loadContinueConfig(options.workspacePath)
      : undefined;

    const autocompleteModel = this.resolveAutocompleteModel(continueConfig);
    const tabAutocompleteOptions = {
      ...(continueConfig?.tabAutocompleteOptions ?? {}),
    } satisfies LiteTabAutocompleteOptions;

    if (options.settings?.enableTabAutocomplete !== undefined) {
      tabAutocompleteOptions.disable = !options.settings.enableTabAutocomplete;
    }

    return {
      autocompleteModel,
      tabAutocompleteOptions,
      nextEditEnabled: options.settings?.enableNextEdit ?? true,
    };
  }

  private async loadContinueConfig(
    workspacePath: string,
  ): Promise<ContinueJsonLike | undefined> {
    const candidatePaths = [
      path.join(workspacePath, ".continue", "config.json"),
      path.join(workspacePath, ".continue", "config.yaml"),
      path.join(workspacePath, ".continue", "config.yml"),
    ];

    for (const candidatePath of candidatePaths) {
      if (!(await this.exists(candidatePath))) {
        continue;
      }

      const source = await readFile(candidatePath, "utf8");
      if (candidatePath.endsWith(".json")) {
        return JSON.parse(source) as ContinueJsonLike;
      }

      return YAML.parse(source) as ContinueJsonLike;
    }

    return undefined;
  }

  private resolveAutocompleteModel(
    config: ContinueJsonLike | undefined,
  ): LiteAutocompleteModel | undefined {
    const tabAutocompleteModel = config?.tabAutocompleteModel;
    if (Array.isArray(tabAutocompleteModel)) {
      return tabAutocompleteModel[0];
    }

    if (tabAutocompleteModel) {
      return tabAutocompleteModel;
    }

    return config?.models?.find((model) =>
      model.roles?.includes("autocomplete"),
    );
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
