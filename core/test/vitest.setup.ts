import { TextDecoder, TextEncoder } from "util";

import { beforeAll } from "vitest";

beforeAll(() => {
  globalThis.TextEncoder = TextEncoder;
  // @ts-ignore
  globalThis.TextDecoder = TextDecoder;
});
