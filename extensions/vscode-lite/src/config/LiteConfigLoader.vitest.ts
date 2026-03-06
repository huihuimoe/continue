import { describe, expect, it } from "vitest";

import { LiteConfigLoader } from "./LiteConfigLoader";

describe("LiteConfigLoader", () => {
  it("parses autocomplete/next-edit fields from Continue json config", async () => {
    const loader = new LiteConfigLoader();

    const config = await loader.loadConfig({
      workspacePath: new URL("./__fixtures__/json-workspace", import.meta.url)
        .pathname,
      settings: {
        enableTabAutocomplete: false,
        enableNextEdit: true,
      },
    });

    expect(config.autocompleteModel).toEqual({
      title: "Fixture Autocomplete",
      provider: "test",
      model: "fixture-autocomplete",
      capabilities: ["next_edit"],
    });
    expect(config.tabAutocompleteOptions.disable).toBe(true);
    expect(config.tabAutocompleteOptions.debounceDelay).toBe(123);
    expect(config.nextEditEnabled).toBe(true);
  });

  it("parses autocomplete model from Continue yaml config", async () => {
    const loader = new LiteConfigLoader();

    const config = await loader.loadConfig({
      workspacePath: new URL("./__fixtures__/yaml-workspace", import.meta.url)
        .pathname,
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
