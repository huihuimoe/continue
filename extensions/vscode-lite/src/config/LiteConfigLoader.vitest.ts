import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  getAutocompleteModelIdentity,
  LiteConfigLoader,
} from "./LiteConfigLoader";

describe("LiteConfigLoader", () => {
  it("parses autocomplete/next-edit fields from Continue json config", async () => {
    const loader = new LiteConfigLoader();

    const selectedIdentity = getAutocompleteModelIdentity({
      title: "Backup Autocomplete",
      provider: "test",
      model: "backup-autocomplete",
    });

    const config = await loader.loadConfig({
      workspacePath: path.join(__dirname, "__fixtures__", "json-workspace"),
      settings: {
        enableTabAutocomplete: false,
        enableNextEdit: true,
        selectedAutocompleteModel: selectedIdentity,
      },
    });

    expect(
      config.autocompleteModels.map((model) => model.title ?? model.name),
    ).toEqual(["Fixture Autocomplete", "Backup Autocomplete"]);
    expect(config.selectedAutocompleteModelTitle).toBe("Backup Autocomplete");
    expect(config.selectedAutocompleteModelId).toBe(selectedIdentity);
    expect(config.autocompleteModel?.title).toBe("Backup Autocomplete");
    expect(
      config.autocompleteModels.filter(
        (model) => model.identity === selectedIdentity,
      ).length,
    ).toBe(1);

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
    const fallbackIdentity = getAutocompleteModelIdentity({
      title: "Fixture Autocomplete",
      provider: "test",
      model: "fixture-autocomplete",
    });

    const config = await loader.loadConfig({
      workspacePath: path.join(__dirname, "__fixtures__", "json-workspace"),
      settings: {
        enableTabAutocomplete: true,
        enableNextEdit: false,
        selectedAutocompleteModel: "missing",
      },
    });

    expect(config.autocompleteModel?.title).toBe("Fixture Autocomplete");
    expect(config.selectedAutocompleteModelTitle).toBe("Fixture Autocomplete");
    expect(config.selectedAutocompleteModelId).toBe(fallbackIdentity);
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

    const yamlIdentity = getAutocompleteModelIdentity({
      name: "YAML Autocomplete",
      provider: "openai",
      model: "gpt-4.1-mini",
    });

    expect(config.autocompleteModel).toEqual({
      name: "YAML Autocomplete",
      provider: "openai",
      model: "gpt-4.1-mini",
      roles: ["autocomplete"],
      capabilities: ["next_edit"],
      identity: yamlIdentity,
    });
    expect(config.tabAutocompleteOptions.disable).toBe(false);
    expect(config.tabAutocompleteOptions.multilineCompletions).toBe("always");
    expect(config.nextEditEnabled).toBe(false);
  });
});
