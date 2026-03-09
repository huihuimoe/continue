import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./compatTransport.js", () => ({
  createCompatTransport: vi.fn(),
}));

vi.mock("./getAgentOptions.js", () => ({
  getAgentOptions: vi.fn(),
}));

vi.mock("./util.js", () => ({
  getProxy: vi.fn(() => undefined),
  shouldBypassProxy: vi.fn(() => false),
}));

import { fetchwithRequestOptions } from "./fetch.js";
import { createCompatTransport } from "./compatTransport.js";
import { getAgentOptions } from "./getAgentOptions.js";
import { getProxy, shouldBypassProxy } from "./util.js";

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
    expect(createCompatTransport).not.toHaveBeenCalled();
  });

  it("passes host with port to bypass matching and keeps native fast path when bypassed", async () => {
    const nativeFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("ok", { status: 200 }));

    vi.stubGlobal("fetch", nativeFetch);

    vi.mocked(getProxy).mockReturnValue("http://proxy.example.com:3128");
    vi.mocked(shouldBypassProxy).mockReturnValue(true);

    const response = await fetchwithRequestOptions(
      "http://example.com:8080/test",
      {
        method: "GET",
      },
    );

    expect(response.status).toBe(200);
    expect(shouldBypassProxy).toHaveBeenCalledWith(
      "example.com:8080",
      undefined,
    );
    expect(nativeFetch).toHaveBeenCalled();
    expect(getAgentOptions).not.toHaveBeenCalled();
    expect(createCompatTransport).not.toHaveBeenCalled();
  });

  it("uses the compat transport for compatibility-only requests", async () => {
    const nativeFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("ok", { status: 200 }));

    vi.stubGlobal("fetch", nativeFetch);
    vi.mocked(createCompatTransport).mockResolvedValue({
      dispatcher: { dispatch: vi.fn() } as any,
      signal: undefined,
      proxy: undefined,
      shouldBypassProxy: false,
      close: vi.fn<() => Promise<void>>().mockResolvedValue(),
    });

    const requestOptions = {
      timeout: 1,
      headers: { "x-request-options": "2" },
    };

    const response = await fetchwithRequestOptions(
      "http://example.com/test",
      {
        method: "POST",
        headers: { "x-test": "1" },
        body: JSON.stringify({ hello: "world" }),
      },
      requestOptions,
    );

    expect(response.status).toBe(200);
    expect(createCompatTransport).toHaveBeenCalledWith(
      expect.any(URL),
      requestOptions,
      undefined,
    );
    expect(nativeFetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: "POST",
        headers: {
          "x-test": "1",
          "x-request-options": "2",
        },
        body: JSON.stringify({ hello: "world" }),
        dispatcher: expect.any(Object),
      }),
    );
    expect(getAgentOptions).not.toHaveBeenCalled();
  });

  it("closes compat transport after a successful compat response body is consumed", async () => {
    const close = vi.fn<() => Promise<void>>().mockResolvedValue();
    const nativeFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("ok"));
            controller.close();
          },
        }),
        { status: 200 },
      ),
    );

    vi.stubGlobal("fetch", nativeFetch);
    vi.mocked(createCompatTransport).mockResolvedValue({
      dispatcher: { dispatch: vi.fn() } as any,
      signal: undefined,
      proxy: undefined,
      shouldBypassProxy: false,
      close,
    });

    const response = await fetchwithRequestOptions(
      "http://example.com/test",
      {},
      { timeout: 1 },
    );

    expect(close).not.toHaveBeenCalled();
    await expect(response.text()).resolves.toBe("ok");
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("closes compat transport when a successful compat response body is cancelled", async () => {
    const close = vi.fn<() => Promise<void>>().mockResolvedValue();
    const nativeFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("ok"));
          },
        }),
        { status: 200 },
      ),
    );

    vi.stubGlobal("fetch", nativeFetch);
    vi.mocked(createCompatTransport).mockResolvedValue({
      dispatcher: { dispatch: vi.fn() } as any,
      signal: undefined,
      proxy: undefined,
      shouldBypassProxy: false,
      close,
    });

    const response = await fetchwithRequestOptions(
      "http://example.com/test",
      {},
      { timeout: 1 },
    );

    await response.body?.cancel();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("closes compat transport even when a successful compat response body is never consumed", async () => {
    const close = vi.fn<() => Promise<void>>().mockResolvedValue();
    const nativeFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new TextEncoder().encode("ok"));
            controller.close();
          },
        }),
        { status: 200 },
      ),
    );

    vi.stubGlobal("fetch", nativeFetch);
    vi.mocked(createCompatTransport).mockResolvedValue({
      dispatcher: { dispatch: vi.fn() } as any,
      signal: undefined,
      proxy: undefined,
      shouldBypassProxy: false,
      close,
    });

    const response = await fetchwithRequestOptions(
      "http://example.com/test",
      {},
      { timeout: 1 },
    );

    expect(response.status).toBe(200);
    expect(close).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(close).toHaveBeenCalledTimes(1);
  });
});
