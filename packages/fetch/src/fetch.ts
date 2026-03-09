import { RequestOptions } from "@continuedev/config-types";
import { createCompatTransport } from "./compatTransport.js";
import { getProxy, shouldBypassProxy } from "./util.js";

type CompatRequestInit = RequestInit & {
  dispatcher?: unknown;
};

function requiresCompatibilityTransport(
  requestOptions: RequestOptions | undefined,
  proxy: string | undefined,
  shouldBypass: boolean,
): boolean {
  if (proxy && !shouldBypass) {
    return true;
  }

  if (!requestOptions) {
    return false;
  }

  return Boolean(
    requestOptions.timeout !== undefined ||
    requestOptions.verifySsl !== undefined ||
    requestOptions.caBundlePath ||
    requestOptions.clientCertificate ||
    requestOptions.noProxy?.length,
  );
}

function logRequest(
  method: string,
  url: URL,
  headers: { [key: string]: string },
  body: BodyInit | null | undefined,
  proxy?: string,
  shouldBypass?: boolean,
) {
  console.log("=== FETCH REQUEST ===");
  console.log(`Method: ${method}`);
  console.log(`URL: ${url.toString()}`);

  // Log headers in curl format
  console.log("Headers:");
  for (const [key, value] of Object.entries(headers)) {
    console.log(`  -H '${key}: ${value}'`);
  }

  // Log proxy information
  if (proxy && !shouldBypass) {
    console.log(`Proxy: ${proxy}`);
  }

  // Log body
  if (body) {
    console.log(`Body: ${body}`);
  }

  // Generate equivalent curl command
  let curlCommand = `curl -X ${method}`;
  for (const [key, value] of Object.entries(headers)) {
    curlCommand += ` -H '${key}: ${value}'`;
  }
  if (body) {
    curlCommand += ` -d '${body}'`;
  }
  if (proxy && !shouldBypass) {
    curlCommand += ` --proxy '${proxy}'`;
  }
  curlCommand += ` '${url.toString()}'`;
  console.log(`Equivalent curl: ${curlCommand}`);
  console.log("=====================");
}

async function logResponse(resp: Response) {
  console.log("=== FETCH RESPONSE ===");
  console.log(`Status: ${resp.status} ${resp.statusText}`);
  console.log("Response Headers:");
  resp.headers.forEach((value, key) => {
    console.log(`  ${key}: ${value}`);
  });

  // TODO: For streamed responses, this caused the response to be consumed and the connection would just hang open
  // Clone response to read body without consuming it
  // const respClone = resp.clone();
  // try {
  //   const responseText = await respClone.text();
  //   console.log(`Response Body: ${responseText}`);
  // } catch (e) {
  //   console.log("Could not read response body:", e);
  // }
  console.log("======================");
}

function logError(error: unknown) {
  console.log("=== FETCH ERROR ===");
  console.log(`Error: ${error}`);
  console.log("===================");
}

function once<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<void>,
): (...args: TArgs) => Promise<void> {
  let pending: Promise<void> | undefined;

  return async (...args: TArgs) => {
    if (!pending) {
      pending = fn(...args);
    }

    await pending;
  };
}

async function safeCloseCompatTransport(close: () => Promise<void>) {
  try {
    await close();
  } catch (error) {
    if (process.env.VERBOSE_FETCH) {
      logError(error);
    }
  }
}

async function wrapCompatResponse(
  response: Response,
  close: () => Promise<void>,
): Promise<Response> {
  const cleanup = once(safeCloseCompatTransport.bind(null, close));

  if (!response.body) {
    await cleanup();
    return response;
  }

  const [callerBody, cleanupBody] = response.body.tee();
  const reader = callerBody.getReader();
  const cleanupReader = cleanupBody.getReader();

  async function drainCleanupBranch() {
    try {
      while (true) {
        const { done } = await cleanupReader.read();
        if (done) {
          break;
        }
      }
    } catch {
    } finally {
      await cleanup();
    }
  }

  const cleanupTimer = setTimeout(() => {
    void drainCleanupBranch();
  }, 0);

  const wrappedBody = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();

        if (done) {
          clearTimeout(cleanupTimer);
          controller.close();
          await cleanupReader.cancel();
          await cleanup();
          return;
        }

        controller.enqueue(value);
      } catch (error) {
        clearTimeout(cleanupTimer);
        controller.error(error);
        await cleanupReader.cancel(error);
        await cleanup();
      }
    },
    async cancel(reason) {
      clearTimeout(cleanupTimer);
      try {
        await Promise.allSettled([
          reader.cancel(reason),
          cleanupReader.cancel(reason),
        ]);
      } finally {
        await cleanup();
      }
    },
  });

  const wrappedResponse = new Response(wrappedBody, {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });

  Object.defineProperties(wrappedResponse, {
    url: {
      value: response.url,
    },
    redirected: {
      value: response.redirected,
    },
    type: {
      value: response.type,
    },
  });

  return wrappedResponse;
}

export async function fetchwithRequestOptions(
  url_: URL | string,
  init?: RequestInit,
  requestOptions?: RequestOptions,
): Promise<Response> {
  const url = typeof url_ === "string" ? new URL(url_) : url_;
  if (url.host === "localhost") {
    url.host = "127.0.0.1";
  }

  // Get proxy from options or environment variables
  const proxy = getProxy(url.protocol, requestOptions);

  // Check if should bypass proxy based on requestOptions or NO_PROXY env var
  const shouldBypass = shouldBypassProxy(url.host, requestOptions);

  let headers: { [key: string]: string } = {};

  // Handle different header formats
  if (init?.headers) {
    const headersSource = init.headers as any;

    // Check if it's a Headers-like object (OpenAI v5 HeadersList, standard Headers)
    if (headersSource && typeof headersSource.forEach === "function") {
      // Use forEach method which works reliably on Headers objects
      headersSource.forEach((value: string, key: string) => {
        headers[key] = value;
      });
    } else if (Array.isArray(headersSource)) {
      // This is an array of [key, value] tuples
      for (const [key, value] of headersSource) {
        headers[key] = value as string;
      }
    } else if (headersSource && typeof headersSource === "object") {
      // This is a plain object
      for (const [key, value] of Object.entries(headersSource)) {
        headers[key] = value as string;
      }
    }
  }

  headers = {
    ...headers,
    ...requestOptions?.headers,
  };

  // Replace localhost with 127.0.0.1
  if (url.hostname === "localhost") {
    url.hostname = "127.0.0.1";
  }

  // add extra body properties if provided
  let updatedBody: string | undefined = undefined;
  try {
    if (requestOptions?.extraBodyProperties && typeof init?.body === "string") {
      const parsedBody = JSON.parse(init.body);
      updatedBody = JSON.stringify({
        ...parsedBody,
        ...requestOptions.extraBodyProperties,
      });
    }
  } catch (e) {
    console.log("Unable to parse HTTP request body: ", e);
  }

  const finalBody = updatedBody ?? init?.body;
  const method = init?.method || "GET";

  if (!requiresCompatibilityTransport(requestOptions, proxy, shouldBypass)) {
    return globalThis.fetch(url, {
      ...init,
      body: finalBody,
      headers,
    });
  }

  const transport = await createCompatTransport(
    url,
    requestOptions,
    init?.signal,
  );

  // Verbose logging for debugging - log request details
  if (process.env.VERBOSE_FETCH) {
    logRequest(method, url, headers, finalBody, proxy, shouldBypass);
  }

  // fetch the request with the provided options
  try {
    const resp = await globalThis.fetch(url, {
      ...init,
      body: finalBody,
      headers,
      dispatcher: transport.dispatcher,
      signal: transport.signal,
    } as CompatRequestInit);

    // Verbose logging for debugging - log response details
    if (process.env.VERBOSE_FETCH) {
      await logResponse(resp);
    }

    if (!resp.ok) {
      const requestId = resp.headers.get("x-request-id");
      if (requestId) {
        console.log(`Request ID: ${requestId}, Status: ${resp.status}`);
      }
    }

    return await wrapCompatResponse(resp, transport.close);
  } catch (error) {
    // Verbose logging for errors
    if (process.env.VERBOSE_FETCH) {
      logError(error);
    }

    if (error instanceof Error && error.name === "AbortError") {
      await safeCloseCompatTransport(transport.close);

      // Return a Response object that streamResponse etc can handle
      return new Response(null, {
        status: 499, // Client Closed Request
        statusText: "Client Closed Request",
      });
    }

    await safeCloseCompatTransport(transport.close);
    throw error;
  }
}
