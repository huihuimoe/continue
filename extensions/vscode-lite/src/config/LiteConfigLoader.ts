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

function getAutocompleteModelIdentity(model: LiteAutocompleteModel): string {
  const provider = model.provider ?? "";
  const modelName = model.model ?? "";
  const title = model.title ?? "";
  const name = model.name ?? "";

  return `provider=${provider}|model=${modelName}|title=${title}|name=${name}`;
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
      options.settings?.selectedAutocompleteModelIdentity,
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
      selectedAutocompleteModelIdentity: selectedModel?.identity,
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
    const identityToIndex = new Map<string, number>();

    const addModel = (model?: LiteAutocompleteModel) => {
      if (!model) {
        return;
      }

      const identity = getAutocompleteModelIdentity(model);
      const normalizedModel = { ...model, identity };

      if (identityToIndex.has(identity)) {
        const existingIndex = identityToIndex.get(identity)!;
        const existing = models[existingIndex];
        models[existingIndex] = { ...existing, ...normalizedModel };
        return;
      }

      identityToIndex.set(identity, models.length);
      models.push(normalizedModel);
    };

    if (Array.isArray(config?.tabAutocompleteModel)) {
      config.tabAutocompleteModel.forEach(addModel);
    } else {
      addModel(config?.tabAutocompleteModel);
    }

    config?.models
      ?.filter((model) => this.modelHasAutocompleteRole(model))
      .forEach(addModel);

    return models;
  }

  private resolveSelectedAutocompleteModel(
    config: ContinueJsonLike | undefined,
    models: LiteAutocompleteModel[],
    overrideIdentity?: string,
  ): LiteAutocompleteModel | undefined {
    if (overrideIdentity) {
      const overrideMatch = models.find(
        (model) => model.identity === overrideIdentity,
      );
      if (overrideMatch) {
        return overrideMatch;
      }
    }

    const tabModel = this.resolveTabAutocompleteModel(config);
    if (tabModel) {
      const identity = getAutocompleteModelIdentity(tabModel);
      return (
        models.find((model) => model.identity === identity) ?? {
          ...tabModel,
          identity,
        }
      );
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
