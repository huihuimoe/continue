import path from "node:path";

import { describe, expect, it } from "vitest";

import { LiteConfigLoader } from "./LiteConfigLoader";

describe("LiteConfigLoader", () => {
  it("parses autocomplete/next-edit fields from Continue json config", async () => {
    const loader = new LiteConfigLoader();

    const config = await loader.loadConfig({
      workspacePath: path.join(__dirname, "__fixtures__", "json-workspace"),
      settings: {
        enableTabAutocomplete: false,
        enableNextEdit: true,
        selectedAutocompleteModel: "Backup Autocomplete",
      },
    });

    expect(
      config.autocompleteModels.map((model) => model.title ?? model.name),
    ).toEqual(["Fixture Autocomplete", "Backup Autocomplete"]);
    expect(config.selectedAutocompleteModelTitle).toBe("Backup Autocomplete");
    expect(config.autocompleteModel?.title).toBe("Backup Autocomplete");

    expect(config.autocompleteModel).toEqual({
      title: "Backup Autocomplete",
      provider: "test",
      model: "backup-autocomplete",
      roles: ["autocomplete"],
    });
    expect(config.tabAutocompleteOptions.disable).toBe(true);
    expect(config.tabAutocompleteOptions.debounceDelay).toBe(123);
    expect(config.nextEditEnabled).toBe(true);
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
    });
    expect(config.tabAutocompleteOptions.disable).toBe(false);
    expect(config.tabAutocompleteOptions.multilineCompletions).toBe("always");
    expect(config.nextEditEnabled).toBe(false);
  });
});
