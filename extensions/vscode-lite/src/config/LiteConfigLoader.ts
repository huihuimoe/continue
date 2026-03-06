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

    const autocompleteModels = this.resolveAutocompleteModels(continueConfig);
    const selectedModel = this.resolveSelectedAutocompleteModel(
      continueConfig,
      autocompleteModels,
      options.settings?.selectedAutocompleteModel,
    );
    const tabAutocompleteOptions = {
      ...(continueConfig?.tabAutocompleteOptions ?? {}),
    } satisfies LiteTabAutocompleteOptions;

    if (options.settings?.enableTabAutocomplete !== undefined) {
      tabAutocompleteOptions.disable = !options.settings.enableTabAutocomplete;
    }

    return {
      autocompleteModels,
      selectedAutocompleteModelTitle: this.getModelTitle(selectedModel),
      autocompleteModel: selectedModel,
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

  private resolveAutocompleteModels(
    config: ContinueJsonLike | undefined,
  ): LiteAutocompleteModel[] {
    const models: LiteAutocompleteModel[] = [];

    if (config?.tabAutocompleteModel) {
      if (Array.isArray(config.tabAutocompleteModel)) {
        models.push(...config.tabAutocompleteModel);
      } else {
        models.push(config.tabAutocompleteModel);
      }
    }

    if (config?.models) {
      models.push(
        ...config.models.filter((model) =>
          this.modelHasAutocompleteRole(model),
        ),
      );
    }

    return models;
  }

  private resolveSelectedAutocompleteModel(
    config: ContinueJsonLike | undefined,
    models: LiteAutocompleteModel[],
    overrideTitle?: string,
  ): LiteAutocompleteModel | undefined {
    if (overrideTitle) {
      const overrideMatch = this.findModelByTitle(models, overrideTitle);
      if (overrideMatch) {
        return overrideMatch;
      }
    }

    const tabModel = this.resolveTabAutocompleteModel(config);
    if (tabModel) {
      return tabModel;
    }

    return models.find((model) => this.modelHasAutocompleteRole(model));
  }

  private resolveTabAutocompleteModel(
    config: ContinueJsonLike | undefined,
  ): LiteAutocompleteModel | undefined {
    const candidate = config?.tabAutocompleteModel;
    if (!candidate) {
      return undefined;
    }

    if (Array.isArray(candidate)) {
      return candidate[0];
    }

    return candidate;
  }

  private findModelByTitle(
    models: LiteAutocompleteModel[],
    title: string,
  ): LiteAutocompleteModel | undefined {
    return models.find((model) => this.getModelTitle(model) === title);
  }

  private getModelTitle(model?: LiteAutocompleteModel): string | undefined {
    return model?.title ?? model?.name;
  }

  private modelHasAutocompleteRole(model: LiteAutocompleteModel): boolean {
    return Boolean(model.roles?.includes("autocomplete"));
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
