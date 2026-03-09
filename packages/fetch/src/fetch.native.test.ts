import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./node-fetch-patch.js", () => ({
  default: vi.fn(),
}));

vi.mock("./getAgentOptions.js", () => ({
  getAgentOptions: vi.fn(),
}));

vi.mock("./util.js", () => ({
  getProxy: vi.fn(() => undefined),
  shouldBypassProxy: vi.fn(() => false),
}));

import { fetchwithRequestOptions } from "./fetch.js";
import { getAgentOptions } from "./getAgentOptions.js";
import patchedFetch from "./node-fetch-patch.js";

describe("fetchwithRequestOptions native fetch fast path", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("uses native fetch for simple requests without request options", async () => {
    const nativeFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("ok", { status: 200 }));

    vi.stubGlobal("fetch", nativeFetch);

    const response = await fetchwithRequestOptions("http://example.com/test", {
      method: "POST",
      headers: { "x-test": "1" },
      body: "payload",
    });

    expect(response.status).toBe(200);
    expect(nativeFetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: "POST",
        headers: { "x-test": "1" },
        body: "payload",
      }),
    );
    expect(getAgentOptions).not.toHaveBeenCalled();
    expect(patchedFetch).not.toHaveBeenCalled();
  });
});
