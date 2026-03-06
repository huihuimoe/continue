import { describe, expect, it } from "vitest";

import pkg from "../package.json";

describe("lite contributes", () => {
  it("contains only autocomplete and next-edit commands", () => {
    expect(
      pkg.contributes.commands.map((command) => command.command).sort(),
    ).toEqual(
      [
        "continue.forceAutocomplete",
        "continue.forceNextEdit",
        "continue.openTabAutocompleteConfigMenu",
        "continue.toggleNextEditEnabled",
        "continue.toggleTabAutocompleteEnabled",
      ].sort(),
    );
  });

  it("keeps lite-only config and schema contributions", () => {
    expect(
      Object.keys(pkg.contributes.configuration.properties).sort(),
    ).toEqual(
      [
        "continue.enableNextEdit",
        "continue.enableTabAutocomplete",
        "continue.pauseTabAutocompleteOnBattery",
      ].sort(),
    );
    expect(pkg.contributes.jsonValidation).toEqual([
      {
        fileMatch: "**/.continue*/config.json",
        url: "./config_schema.json",
      },
      {
        fileMatch: ".continuerc.json",
        url: "./continue_rc_schema.json",
      },
      {
        fileMatch: "**/config.yaml",
        url: "./config-yaml-schema.json",
      },
    ]);
  });
});
