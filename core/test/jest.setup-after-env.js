import { TextDecoder, TextEncoder } from "util";

import { jest } from "@jest/globals";

if (process.env.DEBUG === "jest") {
  jest.setTimeout(5 * 60 * 1000);
}

const globalThis = global;

globalThis.jest = jest;

// https://github.com/mswjs/msw/issues/1576#issuecomment-1482643055
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

// TODO - currently causing tests to fail because sqlite is still running for some reason
// const clearTestDirectory = () => {
//   if (fs.existsSync(process.env.CONTINUE_GLOBAL_DIR!)) {
//     fs.rmSync(process.env.CONTINUE_GLOBAL_DIR!, { recursive: true });
//   }
// };

// globalThis.beforeAll(clearTestDirectory);
// globalThis.afterAll(clearTestDirectory);
