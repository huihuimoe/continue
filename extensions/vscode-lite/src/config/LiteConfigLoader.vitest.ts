import path from "node:path";

import { describe, expect, it } from "vitest";

import { LiteConfigLoader } from "./LiteConfigLoader";

function buildModelIdentity(model: {
  provider?: string;
  model?: string;
  title?: string;
  name?: string;
}) {
  const provider = model.provider ?? "";
  const modelName = model.model ?? "";
  const title = model.title ?? "";
  const name = model.name ?? "";
  return `provider=${provider}|model=${modelName}|title=${title}|name=${name}`;
}

describe("LiteConfigLoader", () => {
  it("parses autocomplete/next-edit fields from Continue json config", async () => {
    const loader = new LiteConfigLoader();

    const selectedIdentity = buildModelIdentity({
      provider: "test",
      model: "backup-autocomplete",
      title: "Backup Autocomplete",
    });

    const config = await loader.loadConfig({
      workspacePath: path.join(__dirname, "__fixtures__", "json-workspace"),
      settings: {
        enableTabAutocomplete: false,
        enableNextEdit: true,
        selectedAutocompleteModelIdentity: selectedIdentity,
      },
    });

    expect(
      config.autocompleteModels.map((model) => model.title ?? model.name),
    ).toEqual(["Fixture Autocomplete", "Backup Autocomplete"]);
    expect(config.selectedAutocompleteModelTitle).toBe("Backup Autocomplete");
    expect(config.selectedAutocompleteModelIdentity).toBe(selectedIdentity);
    expect(config.autocompleteModel?.title).toBe("Backup Autocomplete");

    expect(config.autocompleteModel).toEqual({
      title: "Backup Autocomplete",
      provider: "test",
      model: "backup-autocomplete",
      roles: ["autocomplete"],
      identity: selectedIdentity,
    });
    expect(config.tabAutocompleteOptions.disable).toBe(true);
    expect(config.tabAutocompleteOptions.debounceDelay).toBe(123);
    expect(config.nextEditEnabled).toBe(true);
  });

  it("falls back to tab model when selected identity is missing", async () => {
    const loader = new LiteConfigLoader();
    const fallbackIdentity = buildModelIdentity({
      provider: "test",
      model: "fixture-autocomplete",
      title: "Fixture Autocomplete",
    });

    const config = await loader.loadConfig({
      workspacePath: path.join(__dirname, "__fixtures__", "json-workspace"),
      settings: {
        enableTabAutocomplete: true,
        enableNextEdit: false,
        selectedAutocompleteModelIdentity: "missing",
      },
    });

    expect(config.autocompleteModel?.title).toBe("Fixture Autocomplete");
    expect(config.selectedAutocompleteModelTitle).toBe("Fixture Autocomplete");
    expect(config.selectedAutocompleteModelIdentity).toBe(fallbackIdentity);
    expect(config.autocompleteModel?.identity).toBe(fallbackIdentity);
    expect(
      config.autocompleteModels.map((model) => model.title ?? model.name),
    ).toContain("Fixture Autocomplete");
  });

  it("parses autocomplete model from Continue yaml config", async () => {
    const loader = new LiteConfigLoader();

    const config = await loader.loadConfig({
      workspacePath: path.join(__dirname, "__fixtures__", "yaml-workspace"),
      settings: {
        enableTabAutocomplete: true,
        enableNextEdit: false,
      },
    });

    expect(config.autocompleteModel).toEqual({
      name: "YAML Autocomplete",
      provider: "openai",
      model: "gpt-4.1-mini",
      roles: ["autocomplete"],
      capabilities: ["next_edit"],
      identity: buildModelIdentity({
        provider: "openai",
        model: "gpt-4.1-mini",
        name: "YAML Autocomplete",
      }),
    });
    expect(config.selectedAutocompleteModelIdentity).toBe(
      buildModelIdentity({
        provider: "openai",
        model: "gpt-4.1-mini",
        name: "YAML Autocomplete",
      }),
    );
    expect(config.tabAutocompleteOptions.disable).toBe(false);
    expect(config.tabAutocompleteOptions.multilineCompletions).toBe("always");
    expect(config.nextEditEnabled).toBe(false);
  });
});
